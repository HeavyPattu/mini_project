import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Vibration,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

let AudioModule = null;
try {
  AudioModule = require('expo-av')?.Audio;
} catch (e) {}

import { scanImage, schedulePickup } from '../services/api';
import { DEVICE_COMPONENT_BREAKDOWNS } from '../services/componentDetails';

export default function DonorHomeScreen({ currentUser }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [activeHazardAlert, setActiveHazardAlert] = useState(false);

  // Detail Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Data Privacy Checklist State
  const [privacyChecklist, setPrivacyChecklist] = useState({
    dataWiped: false,
    simRemoved: false,
    terminalsTaped: false,
    cablesBundled: false,
  });

  // Pickup Scheduling Modal State
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [pickupDonorName, setPickupDonorName] = useState(currentUser?.name || '');
  const [pickupPhone, setPickupPhone] = useState(currentUser?.phone || '');
  const [pickupAddress, setPickupAddress] = useState(currentUser?.address || 'Vishrambag, Sangli');
  const [pickupDate, setPickupDate] = useState('Tomorrow, 10:00 AM - 1:00 PM');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmedTrackingCode, setConfirmedTrackingCode] = useState(null);

  // Play hazard sound effect & haptic vibration when high-hazard battery detected
  const playHazardWarningChime = async () => {
    try {
      // Urgent haptic vibration pattern: 400ms pulse, 150ms pause, 400ms pulse
      Vibration.vibrate([0, 400, 150, 400]);

      if (AudioModule && AudioModule.Sound) {
        const { sound } = await AudioModule.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
          { shouldPlay: true, volume: 1.0 }
        );
        await sound.playAsync();
      }
    } catch (e) {
      console.log('Audio/Haptic playback notice:', e.message);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera roll access is needed to scan e-waste items.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        processScan(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Gallery Error', error.message);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera permission is required for live e-waste scanning.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        processScan(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Camera Error', error.message);
    }
  };

  const processScan = async (uri, base64Data = null) => {
    setSelectedImage(uri);
    setScanning(true);
    setScanResult(null);
    setActiveHazardAlert(false);

    try {
      const response = await scanImage(uri, 'donor_scan', base64Data);
      setScanResult(response);

      if (response.high_hazard_alert) {
        setActiveHazardAlert(true);
        playHazardWarningChime();
      }
    } catch (err) {
      Alert.alert(
        'Scan Failed',
        err.response?.data?.detail || err.message || 'Could not connect to Edge-AI inference server.'
      );
    } finally {
      setScanning(false);
    }
  };

  const openItemDetails = (detection) => {
    setSelectedItemDetail(detection);
    // Reset checklist
    setPrivacyChecklist({
      dataWiped: false,
      simRemoved: false,
      terminalsTaped: false,
      cablesBundled: false,
    });
    setModalVisible(true);
  };

  const toggleChecklistItem = (key) => {
    setPrivacyChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleBookDoorstepPickup = async () => {
    if (!pickupDonorName || !pickupPhone || !pickupAddress) {
      Alert.alert('Missing Details', 'Please complete your name, phone, and Sangli pickup address.');
      return;
    }

    setBookingLoading(true);
    try {
      const itemsToBook = [];
      if (scanResult?.detections?.length > 0) {
        scanResult.detections.forEach((d) => {
          itemsToBook.push({
            item: d.class_name,
            category: d.metadata.category,
            hazard: d.metadata.hazard_level,
            qty: 1,
          });
        });
      } else {
        itemsToBook.push({
          item: 'phone',
          category: 'Mobile Telecom',
          hazard: 'High',
          qty: 1,
        });
      }

      const payload = {
        donor_name: pickupDonorName.trim(),
        donor_phone: pickupPhone.trim(),
        address: pickupAddress.trim(),
        scheduled_date: pickupDate,
        items: itemsToBook,
        latitude: 16.8524,
        longitude: 74.5815,
        user_id: currentUser?.id || null,
      };

      const result = await schedulePickup(payload);
      if (result.success) {
        setConfirmedTrackingCode(result.pickup.tracking_code);
      }
    } catch (err) {
      Alert.alert('Booking Error', err.response?.data?.detail || err.message || 'Could not schedule pickup.');
    } finally {
      setBookingLoading(false);
    }
  };

  const classKey = selectedItemDetail?.class_name?.toLowerCase();
  const fallbackBreakdown = classKey ? DEVICE_COMPONENT_BREAKDOWNS[classKey] : null;
  const subComponents = selectedItemDetail?.metadata?.sub_components?.length
    ? selectedItemDetail.metadata.sub_components
    : fallbackBreakdown?.subComponents || [];
  const disassemblySteps = selectedItemDetail?.metadata?.disassembly_steps?.length
    ? selectedItemDetail.metadata.disassembly_steps
    : fallbackBreakdown?.disassemblySteps || [];
  const recyclingProtocols = selectedItemDetail?.metadata?.recycling_protocols?.length
    ? selectedItemDetail.metadata.recycling_protocols
    : fallbackBreakdown?.recyclingProtocols || [];
  const environmentalAlert = selectedItemDetail?.metadata?.environmental_alert
    || fallbackBreakdown?.environmentalAlert
    || '';
  const deviceHeroImage = selectedItemDetail?.metadata?.device_image_url
    || fallbackBreakdown?.deviceImageUrl
    || null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Citizen Welcome Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeSub}>SANGLI CITIZEN PORTAL</Text>
            <Text style={styles.welcomeName}>Namaste, {currentUser?.name || 'Citizen'}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsValue}>180 pts</Text>
            <Text style={styles.pointsLabel}>Eco Credit</Text>
          </View>
        </View>

        {/* Quick Municipal Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>3.8 kg</Text>
            <Text style={styles.statDesc}>E-Waste Diverted</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>16.4 kg</Text>
            <Text style={styles.statDesc}>CO2e Prevented</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>SMKC #4</Text>
            <Text style={styles.statDesc}>Ward Clean Rank</Text>
          </View>
        </View>
      </View>

      {/* AI Camera & Photo Scanner Section */}
      <View style={styles.scannerCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📸 Edge-AI E-Waste Classifier</Text>
          <Text style={styles.modelTag}>YOLOv8 Active</Text>
        </View>
        <Text style={styles.scannerInstructions}>
          Scan phones, laptops, keyboards, mice, flash drives, or earbuds for real-time hazard classification and precious metal valuation.
        </Text>

        {/* Action Buttons: Camera & Gallery */}
        <View style={styles.scanBtnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cameraBtn]}
            onPress={takePhotoWithCamera}
            disabled={scanning}
          >
            <Text style={styles.actionBtnIcon}>📷</Text>
            <Text style={styles.actionBtnText}>Take Live Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.galleryBtn]}
            onPress={pickImageFromGallery}
            disabled={scanning}
          >
            <Text style={styles.actionBtnIcon}>🖼️</Text>
            <Text style={styles.actionBtnText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview & Bounding Box Overlay */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />

            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.scanningText}>Running YOLOv8 Neural Inference...</Text>
              </View>
            )}

            {/* Bounding Box Visual Overlays */}
            {!scanning &&
              scanResult?.detections?.map((det, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.boundingBox,
                    det.metadata?.hazard_level === 'High' ? styles.boxHighHazard : styles.boxLowHazard,
                  ]}
                >
                  <View
                    style={[
                      styles.boxLabel,
                      det.metadata?.hazard_level === 'High' ? styles.boxLabelHigh : styles.boxLabelLow,
                    ]}
                  >
                    <Text style={styles.boxLabelText}>
                      {det.class_name.toUpperCase()} ({(det.confidence * 100).toFixed(0)}%)
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Crimson Hazard Warning Banner if High Hazard Detected */}
        {activeHazardAlert && (
          <View style={styles.hazardBanner}>
            <Text style={styles.hazardBannerTitle}>🚨 CRITICAL BATTERY HAZARD DETECTED</Text>
            <Text style={styles.hazardBannerBody}>
              This item contains a high-density Lithium-ion / Polymer cell with thermal runaway risk under open dumping. Do NOT place in household waste bins.
            </Text>
            <Text style={styles.hazardBinTarget}>
              REQUIRED BIN: ⚡ Hazardous_Battery_Depot
            </Text>
          </View>
        )}

        {/* Detected Components List */}
        {scanResult && !scanning && (
          <View style={styles.detectionList}>
            <Text style={styles.detectionCount}>
              Detected {scanResult.count} Recyclable Component{scanResult.count > 1 ? 's' : ''}:
            </Text>

            {scanResult.detections.map((det, index) => (
              <TouchableOpacity
                key={index}
                style={styles.detectedItemCard}
                onPress={() => openItemDetails(det)}
              >
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemTitleGroup}>
                    <Text style={styles.itemClassName}>{det.class_name.toUpperCase()}</Text>
                    <Text style={styles.itemCategory}>{det.metadata.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.hazardBadge,
                      det.metadata.hazard_level === 'High' ? styles.hazardBadgeHigh : styles.hazardBadgeLow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.hazardBadgeText,
                        det.metadata.hazard_level === 'High'
                          ? styles.hazardBadgeTextHigh
                          : styles.hazardBadgeTextLow,
                      ]}
                    >
                      {det.metadata.hazard_level} Hazard
                    </Text>
                  </View>
                </View>

                {/* Target Bin Tag */}
                <View style={styles.binRow}>
                  <Text style={styles.binLabel}>Assigned Sorting Bin:</Text>
                  <Text style={styles.binValue}>[{det.metadata.target_bin}]</Text>
                </View>

                {/* Valuables Preview */}
                <Text style={styles.valuablesText} numberOfLines={1}>
                  🪙 Recovers: {det.metadata.valuable_metals}
                </Text>

                <View style={styles.viewDetailsBtn}>
                  <Text style={styles.viewDetailsText}>View Safety Protocol & Checklist →</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Doorstep Pickup CTA Button */}
            <TouchableOpacity
              style={styles.schedulePickupBtn}
              onPress={() => setPickupModalVisible(true)}
            >
              <Text style={styles.schedulePickupBtnText}>
                🚚 Schedule Doorstep Collection for Sangli-Miraj
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Item Detail & Safety Handling Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedItemDetail?.class_name.toUpperCase()} SPECIFICATION
                  </Text>
                  <Text style={styles.modalSub}>{selectedItemDetail?.metadata.category}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Hazard Banner in Modal */}
              <View
                style={[
                  styles.modalHazardBox,
                  selectedItemDetail?.metadata.hazard_level === 'High'
                    ? styles.modalHazardHigh
                    : styles.modalHazardLow,
                ]}
              >
                <Text style={styles.modalHazardTitle}>
                  Hazard Classification: {selectedItemDetail?.metadata.hazard_level}
                </Text>
                <Text style={styles.modalHazardBin}>
                  Destination Bin: {selectedItemDetail?.metadata.target_bin}
                </Text>
              </View>

              {/* Composition and Metals */}
              <View style={styles.specSection}>
                <Text style={styles.specTitle}>🪙 Precious & Rare Earth Metals</Text>
                <Text style={styles.specValue}>{selectedItemDetail?.metadata.valuable_metals}</Text>
              </View>

              <View style={styles.specSection}>
                <Text style={styles.specTitle}>☣️ Toxic Chemicals & Environmental Hazards</Text>
                <Text style={styles.specValue}>{selectedItemDetail?.metadata.toxic_materials}</Text>
              </View>

              <View style={styles.specSection}>
                <Text style={styles.specTitle}>📋 Environmental Offsets</Text>
                <Text style={styles.specValue}>
                  • Est. Weight: {selectedItemDetail?.metadata.est_weight_kg} kg{'\n'}
                  • Carbon Offset: {selectedItemDetail?.metadata.co2_offset_kg} kg CO2e
                </Text>
              </View>

              <View style={styles.specSection}>
                <Text style={styles.specTitle}>🛡️ Standard Handling Instructions</Text>
                <Text style={styles.specHandling}>
                  {selectedItemDetail?.metadata.handling_instructions}
                </Text>
              </View>

              {/* Internal Component Breakdown & Anatomy */}
              <View style={styles.breakdownHeaderBox}>
                <Text style={styles.breakdownMainTitle}>🔍 Device Anatomy & Internal Components</Text>
                <Text style={styles.breakdownMainSub}>
                  Detailed visual guide to identify internal sub-components, their exact locations, material recovery values, and safe handling instructions.
                </Text>
              </View>

              {/* Sub-components list */}
              {subComponents.map((sub, idx) => (
                <View key={sub.id || idx} style={styles.componentCard}>
                  {sub.imageUrl ? (
                    <View style={styles.componentImageWrapper}>
                      <Image
                        source={{ uri: sub.imageUrl }}
                        style={styles.componentImage}
                        resizeMode="cover"
                      />
                      <View
                        style={[
                          styles.componentHazardBadge,
                          { backgroundColor: sub.badgeColor || (sub.hazardLevel === 'High' ? '#EF4444' : '#10B981') }
                        ]}
                      >
                        <Text style={styles.componentHazardBadgeText}>
                          {sub.hazardLevel} Hazard
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.componentCardBody}>
                    <Text style={styles.componentName}>{sub.name}</Text>

                    <View style={styles.componentLocationRow}>
                      <Text style={styles.componentLocationLabel}>📍 Location Inside Device:</Text>
                      <Text style={styles.componentLocationValue}>{sub.whereItIs || sub.location}</Text>
                    </View>

                    <View style={styles.componentAppearanceRow}>
                      <Text style={styles.componentAppearanceLabel}>👀 Visual Appearance:</Text>
                      <Text style={styles.componentAppearanceValue}>{sub.appearance}</Text>
                    </View>

                    <View style={styles.componentMaterialsRow}>
                      <Text style={styles.componentMaterialsLabel}>🪙 Key Materials & Elements:</Text>
                      <Text style={styles.componentMaterialsValue}>{sub.materials}</Text>
                    </View>

                    <View style={styles.componentSafetyBox}>
                      <Text style={styles.componentSafetyLabel}>🛡️ Safe Handling Caution:</Text>
                      <Text style={styles.componentSafetyValue}>{sub.handlingSafety}</Text>
                    </View>

                    <View style={styles.componentRecycleBox}>
                      <Text style={styles.componentRecycleLabel}>♻️ Circular Recovery Process:</Text>
                      <Text style={styles.componentRecycleValue}>{sub.recyclingProcess}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Step-by-Step Disassembly Guide */}
              {disassemblySteps.length > 0 && (
                <View style={styles.disassemblySection}>
                  <Text style={styles.disassemblyTitle}>🛠️ Safe Disassembly & Extraction Steps</Text>
                  <Text style={styles.disassemblySub}>
                    Follow this sequence to dismantle without damaging hazardous cells:
                  </Text>
                  {disassemblySteps.map((step, idx) => (
                    <View key={idx} style={styles.disassemblyStepRow}>
                      <View style={styles.stepNumberCircle}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step.replace(/^\d+\.\s*/, '')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* MPCB Rule 19 Protocols */}
              {recyclingProtocols.length > 0 && (
                <View style={styles.protocolSection}>
                  <Text style={styles.protocolTitle}>📋 MPCB Rule 19 Segregation Protocols</Text>
                  {recyclingProtocols.map((proto, idx) => (
                    <View key={idx} style={styles.protocolItemRow}>
                      <Text style={styles.protocolBullet}>•</Text>
                      <Text style={styles.protocolItemText}>{proto}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Environmental Toxicity Warning */}
              {environmentalAlert ? (
                <View style={styles.envAlertBox}>
                  <Text style={styles.envAlertTitle}>⚠️ Landfill & Groundwater Hazard Alert</Text>
                  <Text style={styles.envAlertText}>{environmentalAlert}</Text>
                </View>
              ) : null}

              {/* Mandatory Pre-Handover Data Privacy Checklist */}
              <View style={styles.checklistSection}>
                <Text style={styles.checklistTitle}>
                  🔒 Citizen Data Privacy & Safety Checklist
                </Text>
                <Text style={styles.checklistSub}>
                  Complete before municipal handover to protect personal credentials:
                </Text>

                <TouchableOpacity
                  style={styles.checkItem}
                  onPress={() => toggleChecklistItem('dataWiped')}
                >
                  <View style={[styles.checkBox, privacyChecklist.dataWiped && styles.checkBoxActive]}>
                    {privacyChecklist.dataWiped && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkText}>Factory Reset executed & Google/Apple account unlinked</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkItem}
                  onPress={() => toggleChecklistItem('simRemoved')}
                >
                  <View style={[styles.checkBox, privacyChecklist.simRemoved && styles.checkBoxActive]}>
                    {privacyChecklist.simRemoved && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkText}>Physical SIM card and MicroSD card removed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkItem}
                  onPress={() => toggleChecklistItem('terminalsTaped')}
                >
                  <View style={[styles.checkBox, privacyChecklist.terminalsTaped && styles.checkBoxActive]}>
                    {privacyChecklist.terminalsTaped && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkText}>Detachable battery terminals insulated with tape</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkItem}
                  onPress={() => toggleChecklistItem('cablesBundled')}
                >
                  <View style={[styles.checkBox, privacyChecklist.cablesBundled && styles.checkBoxActive]}>
                    {privacyChecklist.cablesBundled && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkText}>Charging adapters and cords bundled safely</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => {
                  setModalVisible(false);
                  setPickupModalVisible(true);
                }}
              >
                <Text style={styles.modalDoneBtnText}>Proceed to Doorstep Pickup →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Doorstep Pickup Scheduler Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pickupModalVisible}
        onRequestClose={() => setPickupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {confirmedTrackingCode ? (
              <View style={styles.confirmationBox}>
                <Text style={styles.confirmIcon}>🎉</Text>
                <Text style={styles.confirmTitle}>Doorstep Pickup Scheduled!</Text>
                <Text style={styles.confirmSub}>
                  An authorized SMKC Sangli Green Transport van has been assigned to your collection.
                </Text>
                <View style={styles.trackingCard}>
                  <Text style={styles.trackingLabel}>COLLECTION TRACKING CODE</Text>
                  <Text style={styles.trackingCode}>{confirmedTrackingCode}</Text>
                  <Text style={styles.trackingHint}>
                    Present this code to the SMKC driver upon arrival.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalDoneBtn}
                  onPress={() => {
                    setConfirmedTrackingCode(null);
                    setPickupModalVisible(false);
                  }}
                >
                  <Text style={styles.modalDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Doorstep Collection Booking</Text>
                    <Text style={styles.modalSub}>Sangli-Miraj Municipal Clean Hubs</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setPickupModalVisible(false)}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Donor Contact Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pickupDonorName}
                    onChangeText={setPickupDonorName}
                    placeholder="Rohan Patil"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Contact Phone (WhatsApp)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pickupPhone}
                    onChangeText={setPickupPhone}
                    placeholder="+91 98221 44550"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Doorstep Address in Sangli-Miraj</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                    placeholder="Plot 42, Gulmohar Colony, South Shivajinagar, Sangli"
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Preferred Collection Time Window</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pickupDate}
                    onChangeText={setPickupDate}
                    placeholder="Tomorrow, 10:00 AM - 1:00 PM"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <TouchableOpacity
                  style={styles.confirmBookingBtn}
                  onPress={handleBookDoorstepPickup}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBookingBtnText}>
                      Confirm Booking & Generate Tracking ID
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  welcomeSub: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  welcomeName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  pointsValue: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  pointsLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  statDesc: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  scannerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  modelTag: {
    backgroundColor: '#334155',
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  scannerInstructions: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  scanBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  cameraBtn: {
    backgroundColor: '#10B981',
  },
  galleryBtn: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  actionBtnIcon: {
    fontSize: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  boundingBox: {
    position: 'absolute',
    left: '15%',
    top: '20%',
    width: '70%',
    height: '60%',
    borderWidth: 3,
    borderRadius: 8,
  },
  boxHighHazard: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  boxLowHazard: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  boxLabel: {
    position: 'absolute',
    top: -24,
    left: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  boxLabelHigh: {
    backgroundColor: '#EF4444',
  },
  boxLabelLow: {
    backgroundColor: '#10B981',
  },
  boxLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  hazardBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  hazardBannerTitle: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  hazardBannerBody: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  hazardBinTarget: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  detectionList: {
    marginTop: 4,
  },
  detectionCount: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  detectedItemCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitleGroup: {
    flex: 1,
  },
  itemClassName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  itemCategory: {
    color: '#94A3B8',
    fontSize: 11,
  },
  hazardBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  hazardBadgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  hazardBadgeLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  hazardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hazardBadgeTextHigh: {
    color: '#FCA5A5',
  },
  hazardBadgeTextLow: {
    color: '#6EE7B7',
  },
  binRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  binLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  binValue: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  valuablesText: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 4,
  },
  viewDetailsBtn: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  schedulePickupBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  schedulePickupBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#334155',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  modalHazardBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  modalHazardHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  modalHazardLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modalHazardTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  modalHazardBin: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  specSection: {
    marginBottom: 12,
  },
  specTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  specValue: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
  },
  specHandling: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  checklistSection: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checklistTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  checklistSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  checkText: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1,
  },
  modalDoneBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  confirmBookingBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmationBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  confirmIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  confirmTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  confirmSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  trackingCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  trackingLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  trackingCode: {
    color: '#10B981',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: 4,
  },
  trackingHint: {
    color: '#64748B',
    fontSize: 10,
  },
  breakdownHeaderBox: {
    marginTop: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  breakdownMainTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  breakdownMainSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  componentCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
    overflow: 'hidden',
  },
  componentImageWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  componentImage: {
    width: '100%',
    height: '100%',
  },
  componentHazardBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  componentHazardBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  componentCardBody: {
    padding: 12,
  },
  componentName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  componentLocationRow: {
    marginBottom: 6,
  },
  componentLocationLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  componentLocationValue: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 16,
  },
  componentAppearanceRow: {
    marginBottom: 6,
  },
  componentAppearanceLabel: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  componentAppearanceValue: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  componentMaterialsRow: {
    marginBottom: 8,
  },
  componentMaterialsLabel: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
  },
  componentMaterialsValue: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  componentSafetyBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  componentSafetyLabel: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  componentSafetyValue: {
    color: '#FEE2E2',
    fontSize: 11,
    lineHeight: 15,
  },
  componentRecycleBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 8,
    borderRadius: 6,
  },
  componentRecycleLabel: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  componentRecycleValue: {
    color: '#D1FAE5',
    fontSize: 11,
    lineHeight: 15,
  },
  disassemblySection: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  disassemblyTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  disassemblySub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  disassemblyStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  stepNumberCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  stepText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  protocolSection: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  protocolTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  protocolItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  protocolBullet: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  protocolItemText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  envAlertBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  envAlertTitle: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  envAlertText: {
    color: '#FCA5A5',
    fontSize: 11,
    lineHeight: 16,
  },
});

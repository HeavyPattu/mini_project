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
  Vibration,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

let AudioModule = null;
try {
  AudioModule = require('expo-av')?.Audio;
} catch (e) {}

import { scanImage } from '../services/api';
import { DEVICE_COMPONENT_BREAKDOWNS } from '../services/componentDetails';

export default function OperatorDashboardScreen({ currentUser }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [hazardAlertActive, setHazardAlertActive] = useState(false);
  const [teardownModalVisible, setTeardownModalVisible] = useState(false);

  // Operator shift tallies
  const [shiftCount, setShiftCount] = useState(14);
  const [shiftHazardCount, setShiftHazardCount] = useState(5);
  const [recentIntakes, setRecentIntakes] = useState([
    { id: 1, item: 'Laptop Dell Inspiron', bin: 'Hazardous_Battery_Depot', hazard: 'High', time: '10:42 AM' },
    { id: 2, item: 'Mechanical Keyboard', bin: 'Shredder_Feed_Plastic', hazard: 'Low', time: '10:45 AM' },
    { id: 3, item: 'Samsung Galaxy A50', bin: 'Hazardous_Battery_Depot', hazard: 'High', time: '10:50 AM' },
  ]);

  // High hazard audio alarm & haptic vibration
  const triggerHazardAudio = async () => {
    try {
      // Haptic alert pattern for drive triage
      Vibration.vibrate([0, 400, 150, 400]);

      if (AudioModule && AudioModule.Sound) {
        const { sound } = await AudioModule.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
          { shouldPlay: true, volume: 1.0 }
        );
        await sound.playAsync();
      }
    } catch (e) {
      console.log('Audio/Haptic alarm notice:', e.message);
    }
  };

  const handleCaptureIntake = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission needed for drive sorting.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        allowsEditing: false,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        processIntakeScan(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (err) {
      Alert.alert('Camera Error', err.message);
    }
  };

  const handleGalleryIntake = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        processIntakeScan(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (err) {
      Alert.alert('Gallery Error', err.message);
    }
  };

  const processIntakeScan = async (uri, base64Data = null) => {
    setSelectedImage(uri);
    setScanning(true);
    setActiveItem(null);
    setHazardAlertActive(false);

    try {
      const res = await scanImage(uri, 'drive_intake', base64Data);
      if (res.detections && res.detections.length > 0) {
        const topDetection = res.detections[0];
        setActiveItem(topDetection);

        if (topDetection.metadata.hazard_level === 'High') {
          setHazardAlertActive(true);
          triggerHazardAudio();
        }

        // Increment shift tally
        setShiftCount((prev) => prev + 1);
        if (topDetection.metadata.hazard_level === 'High') {
          setShiftHazardCount((prev) => prev + 1);
        }

        // Add to recent feed
        setRecentIntakes((prev) => [
          {
            id: Date.now(),
            item: topDetection.class_name.toUpperCase(),
            bin: topDetection.metadata.target_bin,
            hazard: topDetection.metadata.hazard_level,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 4),
        ]);
      }
    } catch (err) {
      Alert.alert(
        'Intake Error',
        err.response?.data?.detail || err.message || 'YOLOv8 Edge server unreachable.'
      );
    } finally {
      setScanning(false);
    }
  };

  // Quick manual triage button for rapid lines
  const handleManualTally = (itemName, binName, hazardLevel) => {
    setShiftCount((prev) => prev + 1);
    if (hazardLevel === 'High') {
      setShiftHazardCount((prev) => prev + 1);
      triggerHazardAudio();
    }
    setRecentIntakes((prev) => [
      {
        id: Date.now(),
        item: itemName,
        bin: binName,
        hazard: hazardLevel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 4),
    ]);
  };

  const opClassKey = activeItem?.class_name?.toLowerCase();
  const opFallback = opClassKey ? DEVICE_COMPONENT_BREAKDOWNS[opClassKey] : null;
  const opSubComponents = activeItem?.metadata?.sub_components?.length
    ? activeItem.metadata.sub_components
    : opFallback?.subComponents || [];
  const opDisassemblySteps = activeItem?.metadata?.disassembly_steps?.length
    ? activeItem.metadata.disassembly_steps
    : opFallback?.disassemblySteps || [];
  const opRecyclingProtocols = activeItem?.metadata?.recycling_protocols?.length
    ? activeItem.metadata.recycling_protocols
    : opFallback?.recyclingProtocols || [];
  const opEnvironmentalAlert = activeItem?.metadata?.environmental_alert
    || opFallback?.environmentalAlert
    || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Operator Shift Header */}
      <View style={styles.operatorHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.govTitle}>SMKC DRIVE OPERATOR STATION</Text>
          <Text style={styles.operatorName}>{currentUser?.name || 'Sunil Deshmukh (SMKC)'}</Text>
          <Text style={styles.stationLocation}>📍 Central Hub (Near Rajwada, Sangli)</Text>
        </View>
        <View style={styles.shiftBadge}>
          <Text style={styles.shiftBadgeText}>LIVE INTAKE</Text>
        </View>
      </View>

      {/* Shift Metrics Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricNumber}>{shiftCount}</Text>
          <Text style={styles.metricLabel}>Batch Total Items</Text>
        </View>
        <View style={[styles.metricItem, styles.metricBorder]}>
          <Text style={[styles.metricNumber, { color: '#EF4444' }]}>{shiftHazardCount}</Text>
          <Text style={styles.metricLabel}>Batteries Quarantined</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricNumber, { color: '#10B981' }]}>100%</Text>
          <Text style={styles.metricLabel}>Form 6 Compliance</Text>
        </View>
      </View>

      {/* High-Speed Camera Intake Station */}
      <View style={styles.scannerCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.scannerCardTitle}>⚡ High-Speed Drive Intake Scanner</Text>
          <Text style={styles.yoloBadge}>Edge YOLOv8</Text>
        </View>

        <Text style={styles.cardHelp}>
          Rapid optical scanning for drive triage. Immediately reveals physical bin destination and hazard protocols.
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.intakeBtn, styles.cameraIntakeBtn]}
            onPress={handleCaptureIntake}
            disabled={scanning}
          >
            <Text style={styles.btnIcon}>⚡</Text>
            <Text style={styles.btnText}>Rapid Camera Intake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.intakeBtn, styles.galleryIntakeBtn]}
            onPress={handleGalleryIntake}
            disabled={scanning}
          >
            <Text style={styles.btnIcon}>📁</Text>
            <Text style={styles.btnText}>Photo Feed</Text>
          </TouchableOpacity>
        </View>

        {/* Live Scan Preview & Giant Physical Bin Indicator */}
        {selectedImage && (
          <View style={styles.previewBox}>
            <Image source={{ uri: selectedImage }} style={styles.previewImg} resizeMode="cover" />
            {scanning && (
              <View style={styles.scanOverlay}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.scanOverlayText}>Classifying Component & Hazard...</Text>
              </View>
            )}
          </View>
        )}

        {/* HIGH HAZARD ALARM BOX */}
        {hazardAlertActive && (
          <View style={styles.crimsonAlarmBox}>
            <Text style={styles.alarmTitle}>🚨 HAZARDOUS BATTERY QUARANTINE ALARM</Text>
            <Text style={styles.alarmBody}>
              High thermal runaway hazard detected! Tape terminal contact points with Kapton tape and store in the sand-insulated fireproof container immediately.
            </Text>
          </View>
        )}

        {/* GIANT PHYSICAL SORTING BIN ASSIGNMENT */}
        {activeItem && !scanning && (
          <View
            style={[
              styles.giantBinCard,
              activeItem.metadata.hazard_level === 'High'
                ? styles.binCardHigh
                : styles.binCardLow,
            ]}
          >
            <Text style={styles.giantBinPreLabel}>PHYSICAL SEGREGATION DESTINATION:</Text>
            <Text style={styles.giantBinName}>[{activeItem.metadata.target_bin}]</Text>
            <Text style={styles.giantBinItem}>
              Class: {activeItem.class_name.toUpperCase()} • Confidence:{' '}
              {(activeItem.confidence * 100).toFixed(0)}%
            </Text>

            <View style={styles.protocolBox}>
              <Text style={styles.protocolHeader}>Operator Handling Protocol:</Text>
              <Text style={styles.protocolText}>
                {activeItem.metadata.handling_instructions}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.teardownGuideBtn}
              onPress={() => setTeardownModalVisible(true)}
            >
              <Text style={styles.teardownGuideBtnText}>
                🔍 View Internal Components & Safe Teardown Manual →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Manual Quick-Tally Buttons for Fast Drive Queues */}
      <View style={styles.manualTallyCard}>
        <Text style={styles.manualTallyTitle}>⚡ Quick Manual Tally (High-Volume Queue)</Text>
        <Text style={styles.manualTallySub}>Tap to quickly register pre-sorted units:</Text>

        <View style={styles.tallyGrid}>
          <TouchableOpacity
            style={[styles.tallyBtn, styles.tallyBtnHigh]}
            onPress={() => handleManualTally('PHONE', 'Hazardous_Battery_Depot', 'High')}
          >
            <Text style={styles.tallyBtnTitle}>+1 Smartphone</Text>
            <Text style={styles.tallyBtnSub}>High Hazard (Li-ion)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tallyBtn, styles.tallyBtnHigh]}
            onPress={() => handleManualTally('LAPTOP', 'Hazardous_Battery_Depot', 'High')}
          >
            <Text style={styles.tallyBtnTitle}>+1 Laptop</Text>
            <Text style={styles.tallyBtnSub}>High Hazard (Battery)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tallyBtn, styles.tallyBtnHigh]}
            onPress={() => handleManualTally('EARBUD', 'Hazardous_Battery_Depot', 'High')}
          >
            <Text style={styles.tallyBtnTitle}>+1 TWS Earbud</Text>
            <Text style={styles.tallyBtnSub}>High Hazard (Coin Cell)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tallyBtn, styles.tallyBtnLow]}
            onPress={() => handleManualTally('KEYBOARD', 'Shredder_Feed_Plastic', 'Low')}
          >
            <Text style={styles.tallyBtnTitle}>+1 Keyboard</Text>
            <Text style={styles.tallyBtnSub}>Low (ABS Shredder)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tallyBtn, styles.tallyBtnLow]}
            onPress={() => handleManualTally('MOUSE', 'Shredder_Feed_Plastic', 'Low')}
          >
            <Text style={styles.tallyBtnTitle}>+1 Mouse</Text>
            <Text style={styles.tallyBtnSub}>Low (Plastic Shell)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tallyBtn, styles.tallyBtnMed]}
            onPress={() => handleManualTally('PENDRIVE', 'Precious_Metals_Bin', 'Low')}
          >
            <Text style={styles.tallyBtnTitle}>+1 Flash Drive</Text>
            <Text style={styles.tallyBtnSub}>NAND Gold Recovery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Recent Intake Feed */}
      <View style={styles.recentFeedCard}>
        <Text style={styles.recentFeedTitle}>📋 Shift Activity Feed (Sangli-Miraj Central)</Text>
        {recentIntakes.map((log) => (
          <View key={log.id} style={styles.feedRow}>
            <View style={styles.feedLeft}>
              <Text style={styles.feedItemName}>{log.item}</Text>
              <Text style={styles.feedBinName}>Destination: {log.bin}</Text>
            </View>
            <View style={styles.feedRight}>
              <View
                style={[
                  styles.feedBadge,
                  log.hazard === 'High' ? styles.feedBadgeHigh : styles.feedBadgeLow,
                ]}
              >
                <Text
                  style={[
                    styles.feedBadgeText,
                    log.hazard === 'High' ? styles.feedBadgeTextHigh : styles.feedBadgeTextLow,
                  ]}
                >
                  {log.hazard}
                </Text>
              </View>
              <Text style={styles.feedTime}>{log.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Operator Teardown & Component Breakdown Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={teardownModalVisible}
        onRequestClose={() => setTeardownModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {activeItem?.class_name.toUpperCase()} INTERNAL TEARDOWN GUIDE
                  </Text>
                  <Text style={styles.modalSub}>{activeItem?.metadata?.category}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setTeardownModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Sub-components list */}
              {opSubComponents.map((sub, idx) => (
                <View key={sub.id || idx} style={styles.opCompCard}>
                  {sub.imageUrl ? (
                    <View style={styles.opCompImageWrapper}>
                      <Image
                        source={{ uri: sub.imageUrl }}
                        style={styles.opCompImage}
                        resizeMode="cover"
                      />
                      <View
                        style={[
                          styles.opHazardPill,
                          { backgroundColor: sub.badgeColor || (sub.hazardLevel === 'High' ? '#EF4444' : '#10B981') }
                        ]}
                      >
                        <Text style={styles.opHazardPillText}>{sub.hazardLevel}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.opCompBody}>
                    <Text style={styles.opCompName}>{sub.name}</Text>
                    <Text style={styles.opCompLocation}>📍 {sub.whereItIs || sub.location}</Text>
                    <Text style={styles.opCompAppearance}>👀 {sub.appearance}</Text>

                    <View style={styles.opSafetyBox}>
                      <Text style={styles.opSafetyText}>🛡️ {sub.handlingSafety}</Text>
                    </View>

                    <View style={styles.opRecycleBox}>
                      <Text style={styles.opRecycleText}>♻️ {sub.recyclingProcess}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Disassembly steps */}
              {opDisassemblySteps.length > 0 && (
                <View style={styles.opStepSection}>
                  <Text style={styles.opStepTitle}>🛠️ Rapid Disassembly Protocol</Text>
                  {opDisassemblySteps.map((step, idx) => (
                    <Text key={idx} style={styles.opStepItem}>{step}</Text>
                  ))}
                </View>
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseDoneBtn}
                onPress={() => setTeardownModalVisible(false)}
              >
                <Text style={styles.modalCloseDoneBtnText}>Close Teardown Guide</Text>
              </TouchableOpacity>
            </ScrollView>
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
  operatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  govTitle: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  operatorName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  stationLocation: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  shiftBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  shiftBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#334155',
  },
  metricNumber: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  scannerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scannerCardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  yoloBadge: {
    backgroundColor: '#334155',
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  cardHelp: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  intakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  cameraIntakeBtn: {
    backgroundColor: '#F59E0B',
  },
  galleryIntakeBtn: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnIcon: {
    fontSize: 16,
  },
  btnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  previewBox: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanOverlayText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  crimsonAlarmBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  alarmTitle: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '900',
  },
  alarmBody: {
    color: '#F8FAFC',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  giantBinCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  binCardHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  binCardLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  giantBinPreLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  giantBinName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginVertical: 4,
  },
  giantBinItem: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  protocolBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  protocolHeader: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  protocolText: {
    color: '#F8FAFC',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  manualTallyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  manualTallyTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  manualTallySub: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 10,
  },
  tallyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tallyBtn: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tallyBtnHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  tallyBtnLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  tallyBtnMed: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#F59E0B',
  },
  tallyBtnTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  tallyBtnSub: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 2,
  },
  recentFeedCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recentFeedTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  feedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  feedLeft: {
    flex: 1,
  },
  feedItemName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  feedBinName: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  feedRight: {
    alignItems: 'flex-end',
  },
  feedBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  feedBadgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  feedBadgeLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  feedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  feedBadgeTextHigh: {
    color: '#FCA5A5',
  },
  feedBadgeTextLow: {
    color: '#6EE7B7',
  },
  feedTime: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
  },
  teardownGuideBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  teardownGuideBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 11,
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
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '800',
  },
  opCompCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    overflow: 'hidden',
  },
  opCompImageWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  opCompImage: {
    width: '100%',
    height: '100%',
  },
  opHazardPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  opHazardPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  opCompBody: {
    padding: 10,
  },
  opCompName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  opCompLocation: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  opCompAppearance: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  opSafetyBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#EF4444',
    marginBottom: 4,
  },
  opSafetyText: {
    color: '#FEE2E2',
    fontSize: 10,
    lineHeight: 14,
  },
  opRecycleBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#10B981',
  },
  opRecycleText: {
    color: '#D1FAE5',
    fontSize: 10,
    lineHeight: 14,
  },
  opStepSection: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  opStepTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  opStepItem: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  modalCloseDoneBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  modalCloseDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

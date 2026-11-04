import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {
  fetchDriveAnalytics,
  resetDriveAnalytics,
  getForm6CsvDownloadUrl,
  generateCertificate,
} from '../services/api';

export default function OperatorAnalyticsScreen() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Certificate Modal State
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [instName, setInstName] = useState('Walchand College of Engineering (WCE)');
  const [instContact, setInstContact] = useState('Dr. P. G. Kulkarni (Principal)');
  const [instLocation, setInstLocation] = useState('Vishrambag, Sangli');
  const [instItemsCount, setInstItemsCount] = useState('45');
  const [instWeightKg, setInstWeightKg] = useState('110.5');
  const [generatingCert, setGeneratingCert] = useState(false);
  const [generatedCert, setGeneratedCert] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await fetchDriveAnalytics();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (err) {
      console.log('Error loading analytics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadForm6Csv = () => {
    const csvUrl = getForm6CsvDownloadUrl();
    Linking.openURL(csvUrl).catch(() => {
      Alert.alert('Download Error', 'Could not open CSV download link in browser.');
    });
  };

  const handleResetBatch = () => {
    Alert.alert(
      'Flush Intake Batch?',
      'This will clear the current drive intake logs to 0 for a new collection shift. Form 6 CSV records should be exported before resetting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await resetDriveAnalytics();
              if (res.success) {
                Alert.alert('Batch Flushed', 'Current intake records have been reset.');
                loadAnalytics();
              }
            } catch (err) {
              Alert.alert('Reset Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleCreateCertificate = async () => {
    if (!instName || !instWeightKg) {
      Alert.alert('Missing Info', 'Please provide Institution name and weight.');
      return;
    }

    setGeneratingCert(true);
    try {
      const payload = {
        institution_name: instName.trim(),
        contact_person: instContact.trim(),
        location: instLocation.trim(),
        items_count: parseInt(instItemsCount) || 10,
        approx_weight_kg: parseFloat(instWeightKg) || 25.0,
        audit_year: '2026-2027',
      };
      const res = await generateCertificate(payload);
      if (res.success) {
        setGeneratedCert(res);
      }
    } catch (err) {
      Alert.alert('Certificate Error', err.message);
    } finally {
      setGeneratingCert(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.govLabel}>SMKC ENVIRONMENTAL AUDITING & COMPLIANCE</Text>
        <Text style={styles.headerTitle}>Drive Analytics & MPCB Form 6</Text>
        <Text style={styles.headerSub}>
          Real-time circular metrics for the Sangli-Miraj-Kupwad Municipal jurisdiction.
        </Text>
      </View>

      {/* Summary KPI Cards */}
      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 30 }} />
      ) : (
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL INTAKE UNITS</Text>
            <Text style={styles.kpiValue}>{analytics?.total_items_scanned || 0}</Text>
            <Text style={styles.kpiHint}>Scanned e-waste devices</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>DIVERTED WEIGHT</Text>
            <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>
              {analytics?.total_weight_kg || 0} kg
            </Text>
            <Text style={styles.kpiHint}>Safe disposal volume</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CARBON OFFSET</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
              {analytics?.total_co2_offset_kg || 0} kg
            </Text>
            <Text style={styles.kpiHint}>CO2e emissions prevented</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>BATTERIES QUARANTINED</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
              {analytics?.high_hazard_count || 0}
            </Text>
            <Text style={styles.kpiHint}>Zero open-dumping</Text>
          </View>
        </View>
      )}

      {/* Category & Bin Breakdowns */}
      {analytics && (
        <View style={styles.breakdownCard}>
          <Text style={styles.cardSectionTitle}>Sorting Bin Segregation Tallies</Text>
          {analytics.bin_breakdown &&
            Object.entries(analytics.bin_breakdown).map(([binName, count]) => (
              <View key={binName} style={styles.barRow}>
                <View style={styles.barLabelGroup}>
                  <Text style={styles.barName}>[{binName}]</Text>
                  <Text style={styles.barCount}>{count} items</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(
                          (count / Math.max(analytics.total_items_scanned, 1)) * 100,
                          100
                        )}%`,
                        backgroundColor: binName.includes('Hazardous')
                          ? '#EF4444'
                          : binName.includes('Precious')
                          ? '#F59E0B'
                          : '#10B981',
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
        </View>
      )}

      {/* MPCB Form-6 Manifest Export Section */}
      <View style={styles.form6Card}>
        <View style={styles.form6HeaderRow}>
          <Text style={styles.form6Badge}>RULE 19 COMPLIANCE</Text>
          <Text style={styles.mpcbLabel}>Maharashtra Pollution Control Board</Text>
        </View>
        <Text style={styles.form6Title}>MPCB Form-6 Transportation Manifest</Text>
        <Text style={styles.form6Desc}>
          Official compliance document mandated for shipping segregated hazardous e-waste from SMKC Sangli facilities to registered recyclers at Kupwad MIDC Phase 2.
        </Text>

        <TouchableOpacity style={styles.downloadForm6Btn} onPress={handleDownloadForm6Csv}>
          <Text style={styles.downloadForm6Text}>
            📥 Export & Download Form-6 CSV Manifest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBatchBtn} onPress={handleResetBatch}>
          <Text style={styles.resetBatchText}>🔄 Flush Shift Logs & Start New Batch</Text>
        </TouchableOpacity>
      </View>

      {/* Institutional Green Audit Certificate Generator Section */}
      <View style={styles.certCard}>
        <Text style={styles.certCardBadge}>NAAC CRITERION 7.1.3</Text>
        <Text style={styles.certCardTitle}>Institutional Green Audit Certificate</Text>
        <Text style={styles.certCardDesc}>
          Issue municipal-sealed Green Audit handover certificates to schools, colleges, and IT firms donating e-waste in Sangli.
        </Text>

        <TouchableOpacity
          style={styles.openCertModalBtn}
          onPress={() => {
            setGeneratedCert(null);
            setCertModalVisible(true);
          }}
        >
          <Text style={styles.openCertModalBtnText}>
            🎓 Generate Institutional Handover Certificate
          </Text>
        </TouchableOpacity>
      </View>

      {/* Certificate Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={certModalVisible}
        onRequestClose={() => setCertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {generatedCert ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Official Sealed Certificate Preview */}
                <View style={styles.certPreviewBox}>
                  <Text style={styles.certWatermark}>SMKC OFFICIAL</Text>
                  <Text style={styles.certGovHeader}>
                    SANGLI-MIRAJ-KUPWAD MUNICIPAL CORPORATION
                  </Text>
                  <Text style={styles.certMainTitle}>CERTIFICATE OF GREEN HANDOVER</Text>
                  <Text style={styles.certUnderText}>
                    Under E-Waste (Management) Rules Form 6 Compliance
                  </Text>

                  <View style={styles.certDivider} />

                  <Text style={styles.certBody}>
                    This is to certify that <Text style={styles.boldText}>{generatedCert.institution_name}</Text>, {generatedCert.location}, has responsibly transferred <Text style={styles.boldText}>{generatedCert.items_count} units ({generatedCert.approx_weight_kg} kg)</Text> of discarded electrical and electronic equipment for scientific segregation.
                  </Text>

                  <View style={styles.certImpactRow}>
                    <View style={styles.certImpactItem}>
                      <Text style={styles.certImpactNum}>{generatedCert.co2_offset_kg} kg</Text>
                      <Text style={styles.certImpactDesc}>CO2e Prevented</Text>
                    </View>
                    <View style={styles.certImpactItem}>
                      <Text style={styles.certImpactNum}>{generatedCert.trees_equivalent}</Text>
                      <Text style={styles.certImpactDesc}>Mature Trees Saved</Text>
                    </View>
                  </View>

                  <Text style={styles.certCriteria}>
                    Valid for: {generatedCert.naac_criteria}
                  </Text>

                  <View style={styles.certFooterRow}>
                    <View>
                      <Text style={styles.certIdText}>Certificate ID: {generatedCert.certificate_id}</Text>
                      <Text style={styles.certHashText}>Hash: {generatedCert.verification_hash}</Text>
                      <Text style={styles.certDateText}>Issued: {generatedCert.issued_date}</Text>
                    </View>
                    <View style={styles.sealCircle}>
                      <Text style={styles.sealText}>SMKC{'\n'}VERIFIED</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneCertBtn}
                  onPress={() => setCertModalVisible(false)}
                >
                  <Text style={styles.doneCertBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalHeading}>Issue Green Audit Certificate</Text>
                    <Text style={styles.modalSubheading}>Sangli-Miraj Educational & Corporate Drives</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setCertModalVisible(false)}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Institution / College Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={instName}
                    onChangeText={setInstName}
                    placeholder="Walchand College of Engineering"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Authorised Signatory / Contact Person</Text>
                  <TextInput
                    style={styles.textInput}
                    value={instContact}
                    onChangeText={setInstContact}
                    placeholder="Principal / Registrar"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Campus Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={instLocation}
                    onChangeText={setInstLocation}
                    placeholder="Vishrambag, Sangli"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Total Units Count</Text>
                    <TextInput
                      style={styles.textInput}
                      value={instItemsCount}
                      onChangeText={setInstItemsCount}
                      keyboardType="numeric"
                      placeholder="45"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Estimated Weight (kg)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={instWeightKg}
                      onChangeText={setInstWeightKg}
                      keyboardType="numeric"
                      placeholder="110.5"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.createCertBtn}
                  onPress={handleCreateCertificate}
                  disabled={generatingCert}
                >
                  {generatingCert ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <Text style={styles.createCertBtnText}>
                      Issue Official Sealed Certificate
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
  govLabel: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  kpiHint: {
    color: '#64748B',
    fontSize: 10,
  },
  breakdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardSectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  barRow: {
    marginBottom: 12,
  },
  barLabelGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barName: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  barCount: {
    color: '#94A3B8',
    fontSize: 11,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  form6Card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  form6HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  form6Badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  mpcbLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  form6Title: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  form6Desc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  downloadForm6Btn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  downloadForm6Text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  resetBatchBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetBatchText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  certCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  certCardBadge: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  certCardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  certCardDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  openCertModalBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  openCertModalBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  modalHeading: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubheading: {
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
    color: '#F8FAFC',
    fontSize: 13,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  createCertBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  createCertBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  certPreviewBox: {
    backgroundColor: '#064E3B',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    marginVertical: 10,
  },
  certWatermark: {
    position: 'absolute',
    top: 100,
    left: 20,
    fontSize: 40,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.05)',
  },
  certGovHeader: {
    color: '#A7F3D0',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  certMainTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  certUnderText: {
    color: '#6EE7B7',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 10,
  },
  certDivider: {
    height: 1,
    backgroundColor: '#10B981',
    marginVertical: 10,
  },
  certBody: {
    color: '#F0FDF4',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  certImpactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
  },
  certImpactItem: {
    alignItems: 'center',
  },
  certImpactNum: {
    color: '#6EE7B7',
    fontSize: 16,
    fontWeight: '900',
  },
  certImpactDesc: {
    color: '#D1FAE5',
    fontSize: 9,
    marginTop: 2,
  },
  certCriteria: {
    color: '#FCD34D',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  certFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 8,
  },
  certIdText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  certHashText: {
    color: '#A7F3D0',
    fontSize: 8,
    fontFamily: 'monospace',
  },
  certDateText: {
    color: '#D1FAE5',
    fontSize: 9,
    marginTop: 2,
  },
  sealCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    color: '#FCD34D',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
  doneCertBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  doneCertBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

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
} from 'react-native';
import { fetchCollectionCenters } from '../services/api';

export default function DonorHubsScreen({ currentUser }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'household', 'drive', 'industrial'

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const data = await fetchCollectionCenters();
      if (data.success) {
        setCenters(data.data);
      }
    } catch (err) {
      console.log('Error loading centers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMap = (center) => {
    const query = encodeURIComponent(`${center.name}, ${center.address}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Could not open map application.');
    });
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone Dialer Error', 'Could not open phone dialer.');
    });
  };

  const handleShareDonorCard = () => {
    Alert.alert(
      'Digital Green Card Shared',
      `Certificate for ${currentUser?.name || 'Citizen Donor'}:\n` +
      `3.8 kg E-Waste Safely Diverted\n` +
      `16.4 kg CO2e Offset Verified by SMKC Sangli.\n` +
      `Digital Verification ID: SMKC-CITIZEN-${currentUser?.id || '2026'}`
    );
  };

  const filteredCenters = centers.filter((c) => {
    if (filterType === 'household') return c.accepts_household === true;
    if (filterType === 'drive') return c.type === 'temporary_drive';
    if (filterType === 'industrial') return c.type === 'industrial_recycler';
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Digital Green Donor Card */}
      <View style={styles.cardWrapper}>
        <View style={styles.greenCardHeader}>
          <View>
            <Text style={styles.cardGovLabel}>SMKC SANGLI-MIRAJ-KUPWAD</Text>
            <Text style={styles.cardTitle}>Official Green Citizen ID</Text>
          </View>
          <View style={styles.cardChip}>
            <Text style={styles.chipText}>ECO LEVEL 3</Text>
          </View>
        </View>

        <View style={styles.cardDonorDetails}>
          <Text style={styles.cardDonorName}>{currentUser?.name || 'Rohan Patil'}</Text>
          <Text style={styles.cardDonorCity}>Sangli Municipal Corporation Region</Text>
          <Text style={styles.cardIdNumber}>ID: SMKC-CITIZEN-00{currentUser?.id || 42}</Text>
        </View>

        <View style={styles.cardStatsRow}>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatNumber}>3.8 kg</Text>
            <Text style={styles.cardStatLabel}>E-Waste Recycled</Text>
          </View>
          <View style={styles.cardStatCol}>
            <Text style={[styles.cardStatNumber, { color: '#6EE7B7' }]}>16.4 kg</Text>
            <Text style={styles.cardStatLabel}>CO2e Prevented</Text>
          </View>
          <View style={styles.cardStatCol}>
            <Text style={[styles.cardStatNumber, { color: '#FCD34D' }]}>0.8</Text>
            <Text style={styles.cardStatLabel}>Trees Saved Equiv</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardComplianceText}>
            Form 6 / Rule 19 Compliant Disposal
          </Text>
          <TouchableOpacity style={styles.shareCardBtn} onPress={handleShareDonorCard}>
            <Text style={styles.shareCardBtnText}>📤 Share Proof</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Sangli-Miraj Municipal Drop-off Hubs */}
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>Sangli-Miraj Drop-Off Hubs</Text>
        <Text style={styles.hubsCount}>{filteredCenters.length} Locations</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
            All ({centers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'household' && styles.filterChipActive]}
          onPress={() => setFilterType('household')}
        >
          <Text
            style={[styles.filterChipText, filterType === 'household' && styles.filterChipTextActive]}
          >
            Household Hubs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'drive' && styles.filterChipActive]}
          onPress={() => setFilterType('drive')}
        >
          <Text
            style={[styles.filterChipText, filterType === 'drive' && styles.filterChipTextActive]}
          >
            Campus Drives
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'industrial' && styles.filterChipActive]}
          onPress={() => setFilterType('industrial')}
        >
          <Text
            style={[styles.filterChipText, filterType === 'industrial' && styles.filterChipTextActive]}
          >
            MIDC Recycler
          </Text>
        </TouchableOpacity>
      </View>

      {/* Centers List */}
      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 24 }} />
      ) : (
        filteredCenters.map((center) => (
          <View key={center.center_id} style={styles.centerCard}>
            <View style={styles.centerHeaderRow}>
              <Text style={styles.centerName}>{center.name}</Text>
              <View
                style={[
                  styles.centerTypeBadge,
                  center.type === 'temporary_drive'
                    ? styles.badgeDrive
                    : center.type === 'industrial_recycler'
                    ? styles.badgeIndustrial
                    : styles.badgePermanent,
                ]}
              >
                <Text style={styles.centerTypeBadgeText}>
                  {center.type === 'temporary_drive'
                    ? 'Drive'
                    : center.type === 'industrial_recycler'
                    ? 'MIDC'
                    : 'Permanent'}
                </Text>
              </View>
            </View>

            <Text style={styles.centerAddress}>📍 {center.address}</Text>
            <Text style={styles.centerHours}>🕒 {center.drive_date || 'Standard hours'}</Text>
            <Text style={styles.centerPhone}>📞 Contact: {center.contact_phone}</Text>

            {center.accepts_household ? (
              <View style={styles.householdTag}>
                <Text style={styles.householdTagText}>✓ Accepts Citizen & Household Items</Text>
              </View>
            ) : (
              <View style={[styles.householdTag, styles.commercialOnlyTag]}>
                <Text style={[styles.householdTagText, { color: '#FCD34D' }]}>
                  ⚠️ Commercial & Institutional Bulk Only
                </Text>
              </View>
            )}

            {/* Action Triggers */}
            <View style={styles.centerBtnRow}>
              <TouchableOpacity
                style={[styles.centerActionBtn, styles.mapBtn]}
                onPress={() => handleOpenMap(center)}
              >
                <Text style={styles.centerActionBtnText}>🗺️ Directions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.centerActionBtn, styles.callBtn]}
                onPress={() => handleCall(center.contact_phone)}
              >
                <Text style={styles.centerActionBtnText}>📞 Call Hub</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
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
  cardWrapper: {
    backgroundColor: '#064E3B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  greenCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardGovLabel: {
    color: '#A7F3D0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  cardChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  cardDonorDetails: {
    marginBottom: 14,
  },
  cardDonorName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  cardDonorCity: {
    color: '#A7F3D0',
    fontSize: 12,
    marginTop: 2,
  },
  cardIdNumber: {
    color: '#6EE7B7',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  cardStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  cardStatNumber: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cardStatLabel: {
    color: '#D1FAE5',
    fontSize: 9,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardComplianceText: {
    color: '#A7F3D0',
    fontSize: 9,
    fontWeight: '600',
  },
  shareCardBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  shareCardBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  hubsCount: {
    color: '#94A3B8',
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  centerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  centerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  centerName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  centerTypeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgePermanent: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeDrive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeIndustrial: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  centerTypeBadgeText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  centerAddress: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  centerHours: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 2,
  },
  centerPhone: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 8,
  },
  householdTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  commercialOnlyTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  householdTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  centerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  centerActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  mapBtn: {
    backgroundColor: '#334155',
  },
  callBtn: {
    backgroundColor: '#0F766E',
  },
  centerActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

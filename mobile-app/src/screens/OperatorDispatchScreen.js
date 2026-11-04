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
import { fetchPickups, updatePickupStatus } from '../services/api';

export default function OperatorDispatchScreen() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'scheduled', 'completed', 'cancelled'
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadPickups();
  }, [activeTab]);

  const loadPickups = async () => {
    setLoading(true);
    try {
      const data = await fetchPickups(activeTab === 'all' ? null : activeTab);
      if (data.success) {
        setPickups(data.data);
      }
    } catch (err) {
      console.log('Error fetching pickups:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (pickupId, newStatus) => {
    setUpdatingId(pickupId);
    try {
      const res = await updatePickupStatus(pickupId, newStatus);
      if (res.success) {
        setPickups((prev) =>
          prev.map((p) => (p.pickup_id === pickupId ? { ...p, status: newStatus } : p))
        );
        Alert.alert('Status Updated', `Pickup is now marked as ${newStatus.toUpperCase()}.`);
      }
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.detail || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // WhatsApp Notification Bridge to Citizens
  const sendWhatsAppNotification = (pickup) => {
    const rawPhone = pickup.donor_phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;

    const message =
      `Namaskar ${pickup.donor_name},\n\n` +
      `Your Sangli Municipal Corporation (SMKC) ReRoute E-Waste collection request is confirmed!\n\n` +
      `📌 Tracking Code: ${pickup.tracking_code}\n` +
      `🕒 Scheduled Slot: ${pickup.scheduled_date}\n` +
      `📍 Address: ${pickup.address}\n\n` +
      `Please ensure all loose lithium batteries are taped at terminals. Our green EV van driver will verify your tracking code on arrival.\n\n` +
      `Sangli-Miraj-Kupwad Municipal Corporation (SMKC)\n` +
      `Helpline: +91 233 2373021`;

    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;

    Linking.openURL(whatsappUrl).catch(() => {
      // Fallback to SMS if WhatsApp client not installed
      const smsUrl = `sms:${cleanPhone}?body=${encodedMsg}`;
      Linking.openURL(smsUrl).catch(() => {
        Alert.alert('Dispatch Error', 'Could not open WhatsApp or SMS on this device.');
      });
    });
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' };
      case 'scheduled':
        return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' };
      case 'completed':
        return { bg: 'rgba(16, 185, 129, 0.2)', text: '#10B981' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' };
      default:
        return { bg: '#334155', text: '#94A3B8' };
    }
  };

  const parseItems = (itemsJson) => {
    try {
      const items = JSON.parse(itemsJson);
      if (Array.isArray(items)) {
        return items.map((i) => `${i.item?.toUpperCase()} (x${i.qty || 1})`).join(', ');
      }
      return itemsJson;
    } catch {
      return itemsJson || 'E-waste package';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.headerBox}>
        <Text style={styles.govLabel}>SMKC MUNICIPAL DISPATCH</Text>
        <Text style={styles.headerTitle}>Pickup Dispatch Kanban Board</Text>
        <Text style={styles.headerSub}>
          Route Sangli-Miraj collection vans and trigger automated citizen WhatsApp alerts.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['all', 'pending', 'scheduled', 'completed', 'cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pickups List */}
      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 30 }} />
      ) : pickups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No Pickups in this Category</Text>
          <Text style={styles.emptySub}>
            New citizen collection requests in Sangli, Miraj, and Kupwad will appear here.
          </Text>
        </View>
      ) : (
        pickups.map((item) => {
          const badge = getStatusBadgeStyle(item.status);
          const isUpdating = updatingId === item.pickup_id;

          return (
            <View key={item.pickup_id} style={styles.pickupCard}>
              {/* Card Top Row */}
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.trackingCode}>{item.tracking_code}</Text>
                  <Text style={styles.donorName}>{item.donor_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.statusText, { color: badge.text }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <Text style={styles.detailRow}>📞 {item.donor_phone}</Text>
              <Text style={styles.detailRow}>📍 {item.address}</Text>
              <Text style={styles.detailRow}>🕒 Slot: {item.scheduled_date}</Text>
              <View style={styles.itemsBox}>
                <Text style={styles.itemsLabel}>Package Contents:</Text>
                <Text style={styles.itemsText}>{parseItems(item.items_json)}</Text>
              </View>

              {/* WhatsApp Notification Bridge */}
              <TouchableOpacity
                style={styles.whatsAppBtn}
                onPress={() => sendWhatsAppNotification(item)}
              >
                <Text style={styles.whatsAppBtnText}>
                  📲 Send WhatsApp Route Update to Citizen
                </Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.stateBtn, styles.btnSchedule]}
                    onPress={() => handleStatusChange(item.pickup_id, 'scheduled')}
                    disabled={isUpdating}
                  >
                    <Text style={styles.stateBtnText}>Mark Scheduled</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'scheduled' && (
                  <TouchableOpacity
                    style={[styles.stateBtn, styles.btnCollect]}
                    onPress={() => handleStatusChange(item.pickup_id, 'completed')}
                    disabled={isUpdating}
                  >
                    <Text style={styles.stateBtnText}>Mark Collected</Text>
                  </TouchableOpacity>
                )}

                {item.status !== 'cancelled' && item.status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.stateBtn, styles.btnCancel]}
                    onPress={() => handleStatusChange(item.pickup_id, 'cancelled')}
                    disabled={isUpdating}
                  >
                    <Text style={[styles.stateBtnText, { color: '#FCA5A5' }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
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
  headerBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  govLabel: {
    color: '#38BDF8',
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
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tabItem: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabItemActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  pickupCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  trackingCode: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  donorName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailRow: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 4,
  },
  itemsBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  itemsLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemsText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  whatsAppBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stateBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnSchedule: {
    backgroundColor: '#2563EB',
  },
  btnCollect: {
    backgroundColor: '#10B981',
  },
  btnCancel: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  stateBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

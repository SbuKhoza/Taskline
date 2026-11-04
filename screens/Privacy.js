import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';

const Privacy = ({ navigation, theme }) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Information We Collect
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We collect information you provide directly to us, such as when you create an account, 
            update your profile, or contact us for support. This may include your name, email address, 
            and any other information you choose to provide.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            How We Use Your Information
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We use the information we collect to:
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Provide, maintain, and improve our services
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Process transactions and send related information
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Send technical notices and support messages
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Respond to your comments and questions
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Information Sharing
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except as described in this policy. We may share your information 
            in certain limited circumstances, such as to comply with legal obligations or protect 
            our rights.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Data Security
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction. However, no method of 
            transmission over the internet is 100% secure.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Data Retention
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We retain your personal information only for as long as necessary to fulfill the purposes 
            outlined in this privacy policy, unless a longer retention period is required by law.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Your Rights
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            You have the right to access, update, or delete your personal information. You may also 
            have the right to restrict or object to certain processing of your data. To exercise 
            these rights, please contact us using the information provided below.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Children's Privacy
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Our service is not intended for children under 13 years of age. We do not knowingly 
            collect personal information from children under 13. If we become aware that we have 
            collected personal information from a child under 13, we will take steps to delete 
            such information.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Changes to This Policy
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We may update this privacy policy from time to time. We will notify you of any changes 
            by posting the new privacy policy on this page and updating the "Last updated" date.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Contact Us
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            If you have any questions about this privacy policy, please contact us at:
          </Text>
          <Text style={[styles.contactInfo, { color: theme.primary }]}>
            snaptask@malloyagroup.co.za
          </Text>

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    marginLeft: 10,
  },
  contactInfo: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
  },
  bottomSpacing: {
    height: 30,
  },
});

export default Privacy;
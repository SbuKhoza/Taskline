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

const Terms = ({ navigation, theme }) => {
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms & Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Acceptance of Terms
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            By accessing and using this application, you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to abide by the above, please do 
            not use this service.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Use License
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Permission is granted to temporarily download one copy of the materials on our 
            application for personal, non-commercial transitory viewing only. This is the grant 
            of a license, not a transfer of title, and under this license you may not:
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Modify or copy the materials
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Use the materials for commercial purposes or public display
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Attempt to reverse engineer any software contained in the application
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • Remove any copyright or proprietary notations from the materials
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            User Accounts
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            When you create an account with us, you must provide information that is accurate, 
            complete, and current at all times. You are responsible for safeguarding the password 
            and for all activities that occur under your account.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Prohibited Uses
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            You may not use our service:
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • For any unlawful purpose or to solicit others to perform unlawful acts
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • To infringe upon or violate our intellectual property rights or the intellectual property rights of others
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate
          </Text>
          <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
            • To submit false or misleading information
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Content
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Our service allows you to post, link, store, share and otherwise make available certain 
            information, text, graphics, videos, or other material. You are responsible for the 
            content that you post to the service, including its legality, reliability, and appropriateness.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs 
            your use of the service, to understand our practices.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Termination
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We may terminate or suspend your account immediately, without prior notice or liability, 
            for any reason whatsoever, including without limitation if you breach the Terms.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Disclaimer
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            The information on this application is provided on an "as is" basis. To the fullest 
            extent permitted by law, this Company excludes all representations, warranties, 
            conditions and terms relating to our application and the use of this application.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Limitation of Liability
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            In no event shall our company, nor its directors, employees, partners, agents, suppliers, 
            or affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
            damages, including without limitation, loss of profits, data, use, goodwill, or other 
            intangible losses, resulting from your use of the service.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Governing Law
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            These Terms shall be interpreted and governed by the laws of the jurisdiction in which 
            our company is based, without regard to its conflict of law provisions.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Changes to Terms
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any 
            time. If a revision is material, we will try to provide at least 30 days notice prior 
            to any new terms taking effect.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Contact Information
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            If you have any questions about these Terms and Conditions, please contact us at:
          </Text>
          <Text style={[styles.contactInfo, { color: theme.primary }]}>
            snaptasklegal@malloyagroup.co.za
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

export default Terms;
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STORE_CONFIG } from "@/lib/storeConfig";

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: May 14, 2025</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            Gourmet Express (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
            is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our online ordering system (the
            &quot;Service&quot;).
          </p>
          <p>
            Please read this Privacy Policy carefully. By using the Service, you
            consent to the collection, use, and disclosure of your information
            as described in this Privacy Policy. If you do not agree with the
            terms, please do not access or use the Service.
          </p>
          <p>
            We may revise this Privacy Policy from time to time. Changes will be
            posted with the updated date above. Please check this page
            periodically to stay informed.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            2. Information We Collect
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.1 Personal Information
          </h3>
          <p>
            We collect information that you provide directly to us, including
            when you create an account, place an order, or contact us. This may
            include your name, email address, phone number, delivery address,
            and payment information.
          </p>
          <p>
            We also collect information about your use of our services,
            including your order history, preferences, and interactions with our
            website and mobile applications.
          </p>
          <p>
            We use &quot;cookies&quot; and similar technologies to collect
            information about your browsing activities and to personalize your
            experience on our website.
          </p>
          <p>
            We use the information we collect to provide, maintain, and improve
            our services, to process your orders, to communicate with you, and
            to personalize your experience.
          </p>
          <p>
            We may share your information with third-party service providers who
            assist us in operating our website, processing payments, and
            delivering orders.
          </p>
          <p>
            We take reasonable measures to protect your personal information
            from unauthorized access, use, or disclosure.
          </p>
          <p>
            You have the right to access, correct, or delete your personal
            information. You can also opt out of receiving marketing
            communications from us.
          </p>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.2 Automatically Collected Information
          </h3>
          <p>We may collect certain data automatically, such as:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Device information and browser type</li>
            <li>IP address</li>
            <li>Operating system</li>
            <li>Usage data (e.g., pages visited, interactions, time spent)</li>
            <li>Cookies and similar tracking tools</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            3. How We Use Your Information
          </h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Process and fulfill your orders</li>
            <li>Manage your account</li>
            <li>Communicate order and service updates</li>
            <li>Send promotional communications if opted in</li>
            <li>Improve our Service and customer experience</li>
            <li>Detect and prevent fraud or misuse</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            4. Sharing Your Information
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">
            4.1 Delivery Partners
          </h3>
          <p>
            We share your delivery details with our drivers or third-party
            services to fulfill your order.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            4.2 Service Providers
          </h3>
          <p>
            We may share your data with service providers such as payment
            processors, hosting services, and email platforms solely to deliver
            our Service.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            4.3 Legal and Business Needs
          </h3>
          <p>
            We may disclose data if required by law or in the case of a business
            transition.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            5. Cookies and Tracking
          </h2>
          <p>
            We use cookies for essential site functionality, analytics, and
            personalization. You may disable cookies in your browser settings,
            though this may limit certain features.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">6. Data Security</h2>
          <p>
            We implement technical safeguards to protect your data. However, no
            system can guarantee complete security. Please use the Service
            responsibly and on secure networks.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">7. Data Retention</h2>
          <p>
            We retain your information only as long as necessary for the
            purposes outlined in this policy or as required by law.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">8. Your Rights</h2>
          <p>You may have rights including:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access or correct your personal data</li>
            <li>Request deletion or restriction of data</li>
            <li>Withdraw consent where applicable</li>
          </ul>
          <p>Contact us below to exercise your rights.</p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            9. Children&apos;s Privacy
          </h2>
          <p>
            We do not knowingly collect information from anyone under 18. If you
            believe a minor has submitted data, contact us promptly.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">10. Contact</h2>
          <p>If you have questions or concerns, please contact:</p>
          <p>
            {STORE_CONFIG.name}
            <br />
            {STORE_CONFIG.address.street}
            <br />
            {STORE_CONFIG.address.city}, {STORE_CONFIG.address.province}{" "}
            {STORE_CONFIG.address.postalCode}
            {/* <br />
            Email: privacy@gourmetexpress.com */}
            <br />
            Phone: {STORE_CONFIG.phone.display}
          </p>
        </div>
      </div>
    </div>
  );
}

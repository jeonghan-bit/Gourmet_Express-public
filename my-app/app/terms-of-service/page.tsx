"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STORE_CONFIG } from "@/lib/storeConfig";

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: May 14, 2025</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to Gourmet Express. These Terms of Service
            (&quot;Terms&quot;) govern your use of the Gourmet Express online
            ordering system (the &quot;Service&quot;). By accessing or using the
            Service, you agree to be bound by these Terms. If you do not agree
            to these Terms, please do not use the Service.
          </p>
          <p>
            Gourmet Express is a restaurant offering an online ordering system
            for pickup and delivery. These Terms outline your responsibilities
            and our policies for using the Service.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">2. Eligibility</h2>
          <p>
            You must be at least 18 years old to use the Service. By using it,
            you represent and warrant that you are of legal age and have the
            authority to enter into this agreement.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">3. User Accounts</h2>
          <p>
            You may need an account to place orders. You are responsible for
            maintaining the confidentiality of your credentials and for all
            activity under your account.
          </p>
          <p>
            Provide accurate and complete information, and keep it updated. We
            reserve the right to suspend or terminate accounts with false or
            outdated information.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            4. Ordering and Payment
          </h2>
          <p>
            When you place an order, you agree to pay the listed price, taxes,
            and delivery charges. You authorize us to process payment through
            the selected method.
          </p>
          <p>
            Prices may vary between online listings and in-person menus. We
            reserve the right to update pricing at any time.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            5. Delivery Services
          </h2>
          <p>
            We offer delivery within certain zones. Times are estimates and may
            vary. Age-restricted items require ID verification at delivery.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">6. Pickup Orders</h2>
          <p>
            For pickup, collect your order at the stated time. Age-restricted
            items require ID verification at pickup.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            7. Cancellations and Refunds
          </h2>
          <p>
            Orders can only be cancelled before preparation begins. For refund
            inquiries, please contact us directly.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            8. Prohibited Conduct
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Use the Service for unlawful purposes</li>
            <li>Harass or impersonate others</li>
            <li>Disrupt or tamper with the Service or its infrastructure</li>
            <li>Use automated tools to access or extract data</li>
            <li>Attempt unauthorized access to our systems</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            9. Intellectual Property
          </h2>
          <p>
            All content and functionality of the Service belong to Gourmet
            Express or its licensors. Trademarks, logos, and design elements may
            not be reused without consent.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            10. Limitation of Liability
          </h2>
          <p>
            To the extent permitted by law, we are not liable for indirect,
            incidental, or consequential damages resulting from your use or
            inability to use the Service.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            11. Indemnification
          </h2>
          <p>
            You agree to indemnify and hold harmless Gourmet Express from any
            claims, damages, or liabilities arising from your violation of these
            Terms.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">12. Modifications</h2>
          <p>
            We may update these Terms and modify or discontinue parts of the
            Service at any time. Continued use of the Service signifies
            acceptance of any changes.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Province of Ontario,
            Canada, without regard to conflict of law rules.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            14. Dispute Resolution
          </h2>
          <p>
            Disputes will be resolved through binding arbitration in Toronto,
            Ontario under applicable Canadian arbitration rules, conducted in
            English.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">15. Contact</h2>
          <p>If you have questions, contact us at:</p>
          <p>
            {STORE_CONFIG.name}
            <br />
            {STORE_CONFIG.address.street}
            <br />
            {STORE_CONFIG.address.city}, {STORE_CONFIG.address.province}{" "}
            {STORE_CONFIG.address.postalCode}
            {/* <br />
            Email: legal@gourmetexpress.com */}
            <br />
            Phone: {STORE_CONFIG.phone.display}
          </p>
        </div>
      </div>
    </div>
  );
}

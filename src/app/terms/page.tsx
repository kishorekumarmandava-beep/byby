export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "var(--space-xl) var(--space-md)", lineHeight: "1.6" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "var(--space-lg)" }}>Terms and Conditions of Use</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
        Last updated: {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", color: "var(--text-primary)" }}>
        <section>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>1. Introduction</h2>
          <p>
            Welcome to ByBy. These Terms and Conditions outline the rules and regulations for the use of the ByBy Platform.
            By accessing this platform, we assume you accept these terms and conditions. Do not continue to use ByBy if you 
            do not agree to take all of the terms and conditions stated on this page.
          </p>
        </section>

        <section style={{ backgroundColor: "var(--bg-secondary)", padding: "var(--space-md)", borderLeft: "4px solid var(--color-primary)", borderRadius: "var(--radius-sm)" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>2. Eligibility and Age Requirements</h2>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            <strong>Use of the ByBy platform is available only to persons who can form legally binding contracts under the Indian Contract Act, 1872.</strong>
          </p>
          <p>
            Persons who are "incompetent to contract" within the meaning of the Indian Contract Act, 1872 including minors, un-discharged insolvents etc. are not eligible to use the ByBy Platform. 
            If you are a minor i.e. under the age of 18 years, you may use the platform only with the involvement, supervision, and prior consent of a parent or legal guardian who agrees to be bound by these Terms of Use.
          </p>
          <p style={{ marginTop: "var(--space-sm)" }}>
            By registering for a ByBy account, providing your phone number, or agreeing to these terms, you represent and warrant that you are at least 18 years of age or that you are using this service under the supervision of a parent or guardian.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>3. Account and Registration Obligations</h2>
          <p>
            If you use the Platform, you shall be responsible for maintaining the confidentiality of your Display Name and Password (or OTP/Phone authentication mechanisms) and you shall be responsible for all activities that occur under your Display Name and Password. You agree that if you provide any information that is untrue, inaccurate, not current or incomplete, we shall have the right to indefinitely suspend or terminate or block access of your membership on the Platform.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>4. Privacy Policy</h2>
          <p>
            We view protection of your privacy as a very important principle. We understand clearly that You and Your Personal Information is one of our most important assets. We store and process Your Information including any sensitive financial information collected on computers that may be protected by physical as well as reasonable technological security measures and procedures in accordance with Information Technology Act 2000 and Rules there under.
          </p>
        </section>
        
        <section>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>5. Communications</h2>
          <p>
            When You use the Platform or send emails or other data, information or communication to us, You agree and understand that You are communicating with Us through electronic records and You consent to receive communications via electronic records periodically and as and when required. We may communicate with you by email, SMS, WhatsApp, or by such other mode of communication, electronic or otherwise.
          </p>
        </section>
      </div>
    </div>
  );
}

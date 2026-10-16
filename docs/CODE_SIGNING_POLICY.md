# Code signing policy

Updated: 2026-10-16. Project: **Rater & Tracker**. Author and brand: **TuseCreation**.

## Current status

The maintainer has accepted MIT licensing for the project's original work and the proposed SignPath Foundation certificate identity. See [LICENSE](../LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md); dependencies retain their own licenses.

We are preparing an application for the SignPath Foundation program. We have **not** been accepted, received a certificate, or enabled production signing. Existing Windows preview installers remain unsigned. This policy is not a claim of sponsorship or a guarantee that SmartScreen will stop warning.

If accepted and enabled, the program attribution will be: “Free code signing provided by SignPath.io, certificate by SignPath Foundation”. The verified Windows publisher would be SignPath Foundation; application authorship stays TuseCreation.

## Responsibilities and controls

- Committer and reviewer: [StuTuse](https://github.com/StuTuse), the repository owner. Contributions from others must be reviewed before release.
- Designated production signing approver: StuTuse. Service-side role enrollment and multi-factor authentication checks remain part of onboarding; they are not asserted complete here.
- Every production signing request requires manual approval. The submitter token must not itself grant production approval rights.
- Build from a fixed source commit on GitHub-hosted runners. Check dependencies with lockfiles and run project checks before submitting a build artifact through the supported origin-verification integration.
- Restrict signing to the files and metadata approved by the service. Third-party binaries retain their upstream identities; Electron-derived executable eligibility must be reviewed by SignPath.
- Verify the installed app, generated uninstaller and final installer, including approved certificate identity, trust and timestamp, before publishing final checksums. Stop publication on missing, invalid or unexpected signatures.

The manual [Windows signing sample template](signing/windows-signing-sample.yml.example) is designed for **unsigned evaluation samples only**. It has no signing token, signing service integration or release publication step. It is inactive in docs: the current GitHub credential lacks workflow permission and GitHub rejected the workflow push. No CI run has completed, and this is not a production signing workflow.

## Privacy and distribution

Read the [Privacy policy / 隐私说明](PRIVACY.md) before enabling account services. Sign-in enables automatic account snapshot synchronization with Tencent CloudBase; we do not claim this software never transmits data. Installer disclosure and opt-out requirements still need a separate review before asserting Foundation compliance.

Windows alpha.21 and Android alpha.6 release packages continue to be available at [dual/2026.10.16.1](https://github.com/StuTuse/rater-tracker/releases/tag/dual/2026.10.16.1). Android retains its original independent signing certificate. Do not substitute a Foundation certificate for Android updates.

Reference: [Foundation conditions](https://signpath.org/terms.html), [GitHub build integration](https://docs.signpath.io/trusted-build-systems/github). The [integration plan](免费开源签名接入方案.md) records outstanding implementation and acceptance work.

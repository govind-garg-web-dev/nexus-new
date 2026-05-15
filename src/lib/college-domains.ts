// Dev/testing override — these specific emails bypass all domain checks.
// Remove before going live beyond testing.
const DEV_ALLOWED_EMAILS = new Set([
  "govindgarg.ne@gmail.com",
  "govindgarg.parzel@gmail.com",
]);

// Domains that are always rejected regardless of other rules
const BLOCKED_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com",
  "hotmail.co.in", "icloud.com", "rediffmail.com", "protonmail.com",
  "proton.me", "aol.com", "live.com", "msn.com", "ymail.com",
]);

// Specific non-.ac.in / non-.edu.in domains that are valid Indian colleges
const EXTRA_ALLOWED_DOMAINS = new Set([
  // BITS Pilani campuses
  "bits-pilani.ac.in",
  "pilani.bits-pilani.ac.in",
  "hyderabad.bits-pilani.ac.in",
  "goa.bits-pilani.ac.in",
  "dubai.bits-pilani.ac.in",
  // Manipal group
  "manipal.edu",
  "mahe.edu",
  "mit.manipal.edu",
  // PES University
  "pes.edu",
  "pesu.edu",
  // Christ University
  "christuniversity.in",
  "christ.edu",
  // Jain University
  "jainuniversity.ac.in",
  "jaindeemeduniversity.org",
  // REVA University
  "reva.edu.in",
  // Amity
  "amity.edu",
  // Symbiosis
  "symbiosis.ac.in",
  "scit.edu",
  // Ashoka
  "ashoka.edu.in",
  // Shiv Nadar
  "snu.edu.in",
  // OP Jindal
  "jgu.edu.in",
  // Azim Premji
  "apu.edu.in",
  // Flame University
  "flame.edu.in",
  // NMIMS
  "nmims.edu",
  "nmims.in",
  // Alliance University
  "alliance.edu.in",
  // Presidency University
  "presidencyuniversity.in",
]);

// Known college domain → display name mapping
const DOMAIN_TO_COLLEGE: Record<string, string> = {
  // IITs
  "iitb.ac.in": "IIT Bombay",
  "iitd.ac.in": "IIT Delhi",
  "iitk.ac.in": "IIT Kanpur",
  "iitm.ac.in": "IIT Madras",
  "iitkgp.ac.in": "IIT Kharagpur",
  "iitg.ac.in": "IIT Guwahati",
  "iitr.ac.in": "IIT Roorkee",
  "iith.ac.in": "IIT Hyderabad",
  "iitbbs.ac.in": "IIT Bhubaneswar",
  "iitgn.ac.in": "IIT Gandhinagar",
  "iitjammu.ac.in": "IIT Jammu",
  "iitmandi.ac.in": "IIT Mandi",
  "iitpkd.ac.in": "IIT Palakkad",
  "iitrpr.ac.in": "IIT Ropar",
  "iitism.ac.in": "IIT (ISM) Dhanbad",
  "iitdh.ac.in": "IIT Dharwad",
  "iitbhilai.ac.in": "IIT Bhilai",
  "iittlb.ac.in": "IIT Tirupati",
  // NITs
  "nitk.ac.in": "NIT Karnataka",
  "nitc.ac.in": "NIT Calicut",
  "nitt.ac.in": "NIT Trichy",
  "nitw.ac.in": "NIT Warangal",
  "nitp.ac.in": "NIT Patna",
  "nits.ac.in": "NIT Silchar",
  "nitap.ac.in": "NIT Arunachal Pradesh",
  "nitdgp.ac.in": "NIT Durgapur",
  "nitj.ac.in": "NIT Jalandhar",
  "nitrr.ac.in": "NIT Raipur",
  "nitmanipur.ac.in": "NIT Manipur",
  "nitmz.ac.in": "NIT Mizoram",
  "nitpy.ac.in": "NIT Puducherry",
  "nitsikkim.ac.in": "NIT Sikkim",
  "nitsri.ac.in": "NIT Srinagar",
  "nituk.ac.in": "NIT Uttarakhand",
  // IIITs
  "iiita.ac.in": "IIIT Allahabad",
  "iiitb.ac.in": "IIIT Bangalore",
  "iiitd.ac.in": "IIIT Delhi",
  "iiith.ac.in": "IIIT Hyderabad",
  "iiitdmj.ac.in": "IIIT Jabalpur",
  "iiitg.ac.in": "IIIT Guwahati",
  "iiitk.ac.in": "IIIT Kota",
  "iiitl.ac.in": "IIIT Lucknow",
  "iiitm.ac.in": "IIITM Gwalior",
  "iiitv.ac.in": "IIIT Vadodara",
  // BITS
  "bits-pilani.ac.in": "BITS Pilani",
  "pilani.bits-pilani.ac.in": "BITS Pilani (Pilani Campus)",
  "hyderabad.bits-pilani.ac.in": "BITS Pilani (Hyderabad Campus)",
  "goa.bits-pilani.ac.in": "BITS Pilani (Goa Campus)",
  // IIMs
  "iimb.ac.in": "IIM Bangalore",
  "iima.ac.in": "IIM Ahmedabad",
  "iimc.ac.in": "IIM Calcutta",
  "iiml.ac.in": "IIM Lucknow",
  "iimk.ac.in": "IIM Kozhikode",
  "iimi.ac.in": "IIM Indore",
  // Top private
  "vit.ac.in": "VIT University",
  "vitap.ac.in": "VIT-AP University",
  "manipal.edu": "Manipal Institute of Technology",
  "srm.edu.in": "SRM Institute of Science and Technology",
  "srmist.edu.in": "SRM Institute of Science and Technology",
  "psgtech.ac.in": "PSG College of Technology",
  "coep.ac.in": "COEP Technological University",
  "vjti.ac.in": "VJTI Mumbai",
  "dtu.ac.in": "Delhi Technological University",
  "nsit.ac.in": "Netaji Subhas University of Technology",
  "igdtuw.ac.in": "IGDTUW Delhi",
  "bmsce.ac.in": "BMS College of Engineering",
  "rvce.ac.in": "RV College of Engineering",
  "pes.edu": "PES University",
  "pesu.edu.in": "PES University",
  "jadavpur.ac.in": "Jadavpur University",
  "du.ac.in": "Delhi University",
  "mu.ac.in": "Mumbai University",
  "annauniv.edu": "Anna University",
};

export type EmailValidationResult =
  | { valid: true; domain: string; collegeName: string | null }
  | { valid: false; reason: string };

export function validateCollegeEmail(email: string): EmailValidationResult {
  const lower = email.toLowerCase().trim();
  const parts = lower.split("@");

  if (parts.length !== 2) {
    return { valid: false, reason: "Invalid email format." };
  }

  const domain = parts[1];

  // Dev override — specific emails that bypass all checks
  if (DEV_ALLOWED_EMAILS.has(lower)) {
    return { valid: true, domain, collegeName: "Developer Account" };
  }

  // Explicit block list
  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Personal email addresses are not allowed. Use your college email.",
    };
  }

  // .ac.in or .edu.in catch-all (covers virtually all Indian colleges)
  if (domain.endsWith(".ac.in") || domain.endsWith(".edu.in")) {
    return {
      valid: true,
      domain,
      collegeName: DOMAIN_TO_COLLEGE[domain] ?? null,
    };
  }

  // Extra whitelist for colleges using non-standard TLDs
  if (EXTRA_ALLOWED_DOMAINS.has(domain)) {
    return {
      valid: true,
      domain,
      collegeName: DOMAIN_TO_COLLEGE[domain] ?? null,
    };
  }

  return {
    valid: false,
    reason:
      "Only college email addresses are accepted (e.g. yourname@college.ac.in).",
  };
}

export function getCollegeName(domain: string): string | null {
  return DOMAIN_TO_COLLEGE[domain] ?? null;
}

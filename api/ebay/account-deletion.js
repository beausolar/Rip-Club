import crypto from "crypto";

export default function handler(req, res) {
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = "https://rip-club.vercel.app/api/ebay/account-deletion";

  // eBay sends GET with ?challenge_code=...
  if (req.method === "GET") {
    const challengeCode = req.query.challenge_code;

    if (!challengeCode) {
      return res.status(400).json({ error: "Missing challenge_code" });
    }
    if (!verificationToken) {
      return res.status(500).json({ error: "Missing EBAY_VERIFICATION_TOKEN" });
    }

    const hash = crypto
      .createHash("sha256")
      .update(challengeCode + verificationToken + endpoint)
      .digest("hex");

    return res.status(200).json({ challengeResponse: hash });
  }

  // eBay sends POST notifications after verification
  if (req.method === "POST") {
    // TODO: delete user data based on payload
    return res.status(200).json({ status: "received" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
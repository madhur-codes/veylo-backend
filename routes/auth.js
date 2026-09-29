const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");

const router = express.Router();

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
);

function createToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}


// =========================
// REGISTER
// =========================

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail
            }
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                createdAt: true
            }
        });

        const token = createToken(user.id);

        res.status(201).json({
            message: "Account created successfully.",
            token,
            user
        });

    } catch (error) {
        console.error("Register error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message: "This account uses Google Login. Continue with Google."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = createToken(user.id);

        res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// =========================
// GOOGLE LOGIN + DRIVE
// =========================

router.get("/google", (req, res) => {

    const authorizationUrl = googleClient.generateAuthUrl({
        access_type: "offline",

        prompt: "consent",

        scope: [
            "openid",
            "email",
            "profile",

            // Google Drive permission
            "https://www.googleapis.com/auth/drive.file"
        ]
    });

    res.redirect(authorizationUrl);
});


// =========================
// GOOGLE CALLBACK
// =========================

router.get("/google/callback", async (req, res) => {

    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                message: "Google authorization code is missing."
            });
        }


        // Exchange authorization code for tokens
        const { tokens } = await googleClient.getToken(code);


        if (!tokens.id_token) {
            return res.status(401).json({
                message: "Google ID token was not received."
            });
        }


        // Verify Google account
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(401).json({
                message: "Unable to verify Google account."
            });
        }


        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || "Veylo User";
        const avatar = payload.picture || null;


        if (!email || !googleId) {
            return res.status(400).json({
                message: "Google account information is incomplete."
            });
        }


        // Make sure Google verified the email
        if (payload.email_verified !== true) {
            return res.status(401).json({
                message: "Google email is not verified."
            });
        }


        const normalizedEmail = email.toLowerCase();


        // Find user by Google ID
        let user = await prisma.user.findUnique({
            where: {
                googleId
            }
        });


        // If not found, check email
        if (!user) {
            user = await prisma.user.findUnique({
                where: {
                    email: normalizedEmail
                }
            });
        }


        // =========================
        // UPDATE EXISTING USER
        // =========================

        if (user) {

            const updateData = {
                googleId,
                avatar: avatar || user.avatar
            };


            // Save Drive refresh token if Google provided one
            if (tokens.refresh_token) {
                updateData.googleDriveRefreshToken =
                    tokens.refresh_token;
            }


            user = await prisma.user.update({
                where: {
                    id: user.id
                },
                data: updateData
            });
        }


        // =========================
        // CREATE NEW USER
        // =========================

        if (!user) {

            user = await prisma.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    googleId,
                    avatar,

                    googleDriveRefreshToken:
                        tokens.refresh_token || null
                }
            });
        }


        // Create Veylo JWT
        const token = createToken(user.id);


        const frontendUrl =
            process.env.FRONTEND_URL ||
            "http://localhost:5500";


        // Send user back to Veylo frontend
        res.redirect(
            `${frontendUrl}/?token=${encodeURIComponent(token)}`
        );

    } catch (error) {

        console.error("Google login error:", error);

        res.status(500).json({
            message: "Google Login failed."
        });
    }
});


// =========================
// CURRENT USER
// =========================

router.get("/me", authenticate, async (req, res) => {

    res.json({
        user: req.user
    });

});


module.exports = router;

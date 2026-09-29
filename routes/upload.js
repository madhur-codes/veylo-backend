const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");

const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");

const router = express.Router();

// Store uploaded files in memory.
// We do NOT save them permanently on the Vercel server.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
});

// Google OAuth client
const googleClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
);

/*
    POST /api/upload

    Headers:
    Authorization: Bearer YOUR_JWT_TOKEN

    Body:
    multipart/form-data
    field name: file
*/
router.post("/", authenticate, upload.single("file"), async (req, res) => {
    try {
        // Make sure a file was received
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded."
            });
        }

        /*
            IMPORTANT:
            At this stage the Google OAuth login only gives us
            basic Google account information.

            We need a Google Drive refresh token before we can
            upload files to the user's Google Drive.
        */

        // Get the logged-in user's complete database record
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        /*
            We will add a Google Drive refresh token to the
            User model in the next step.

            For now, stop here instead of pretending that Drive
            upload is available.
        */

        if (!user.googleDriveRefreshToken) {
            return res.status(403).json({
                message: "Google Drive is not connected yet.",
                code: "DRIVE_NOT_CONNECTED"
            });
        }

        // Configure Google OAuth
        googleClient.setCredentials({
            refresh_token: user.googleDriveRefreshToken
        });

        // Create Google Drive API client
        const drive = google.drive({
            version: "v3",
            auth: googleClient
        });

        // Upload file to Google Drive
        const driveResponse = await drive.files.create({
            requestBody: {
                name: req.file.originalname,
                mimeType: req.file.mimetype
            },
            media: {
                mimeType: req.file.mimetype,
                body: require("stream").Readable.from(req.file.buffer)
            },
            fields: "id,name,mimeType,size,webViewLink,webContentLink"
        });

        const driveFile = driveResponse.data;

        // Save file metadata in PostgreSQL
        const savedFile = await prisma.file.create({
            data: {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: BigInt(req.file.size),
                googleDriveFileId: driveFile.id,
                googleDriveUrl: driveFile.webViewLink || null,
                userId: user.id
            }
        });

        return res.status(201).json({
            message: "File uploaded successfully.",
            file: {
                id: savedFile.id,
                originalName: savedFile.originalName,
                mimeType: savedFile.mimeType,
                size: savedFile.size.toString(),
                googleDriveFileId: savedFile.googleDriveFileId,
                googleDriveUrl: savedFile.googleDriveUrl,
                createdAt: savedFile.createdAt
            }
        });

    } catch (error) {
        console.error("Upload error:", error);

        return res.status(500).json({
            message: "File upload failed."
        });
    }
});

module.exports = router;

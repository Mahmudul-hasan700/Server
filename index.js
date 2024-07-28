const express = require("express");
const path = require("path");
const axios = require("axios");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
function extractVideoId(link) {
    // Updated regex patterns to include more Facebook video URL formats
    const patterns = [
        /(?:https?:\/\/)?(?:www\.|web\.|m\.)?facebook\.com\/(?:video\.php\?v=|watch\/\?v=|watch\?v=|.*?\/videos\/|reel\/|.*?\/reels\/)(\d+)/i,
        /(?:https?:\/\/)?(?:www\.|web\.|m\.)?fb\.watch\/([^\/]+)/i,
        /(?:https?:\/\/)?(?:www\.|web\.|m\.)?facebook\.com\/[^\/]+\/(?:videos|posts|reels)\/(\d+)/i,
        /(?:https?:\/\/)?(?:www\.|web\.|m\.)?facebook\.com\/share\/v\/([^\/\?]+)/i, // New pattern for share URLs
    ];

    for (const pattern of patterns) {
        const match = link.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

async function fetchVideoDetails(videoId) {
    const requestBody = {
        doc_id: "5279476072161634",
        variables: JSON.stringify({
            UFI2CommentsProvider_commentsKey: "CometTahoeSidePaneQuery",
            caller: "CHANNEL_VIEW_FROM_PAGE_TIMELINE",
            displayCommentsContextEnableComment: null,
            displayCommentsContextIsAdPreview: null,
            displayCommentsContextIsAggregatedShare: null,
            displayCommentsContextIsStorySet: null,
            displayCommentsFeedbackContext: null,
            feedbackSource: 41,
            feedLocation: "TAHOE",
            focusCommentID: null,
            privacySelectorRenderLocation: "COMET_STREAM",
            renderLocation: "video_channel",
            scale: 1,
            streamChainingSection: false,
            useDefaultActor: false,
            videoChainingContext: null,
            videoID: videoId,
        }),
        server_timestamps: true,
    };

    const response = await fetch("https://www.facebook.com/api/graphql/", {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
            "Sec-Fetch-Site": "same-origin",
        },
        body: new URLSearchParams(requestBody).toString(),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const json = JSON.parse(text.split("\n")[0]);

    if (!json?.data?.video) {
        throw new Error("Video not found or private video!");
    }

    return json.data.video;
}

async function fetchFacebookVideo(link) {
    const videoId = extractVideoId(link);
    if (!videoId) {
        throw new Error("Invalid URL or unable to extract video ID!");
    }

    try {
        const videoDetails = await fetchVideoDetails(videoId);

        return {
            title: videoDetails.title,
            sd_url: `${videoDetails.playable_url}&sd_quality`,
            hd_url: videoDetails.playable_url_quality_hd || null,
            type: videoDetails.is_reel ? "Reel" : "Video",
        };
    } catch (error) {
        console.error("Error fetching video data:", error);
        throw error;
    }
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/download", async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: "No video URL provided." });
    }

    try {
        const videoData = await fetchFacebookVideo(videoUrl);
        res.json(videoData);
    } catch (error) {
        res.status(500).json({
            error: error.message || "Error fetching video data.",
        });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

app.post("/proxy-download", async (req, res) => {
    const { url, fileName } = req.body;

    try {
        const response = await axios({
            method: "get",
            url: url,
            responseType: "stream",
        });

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
        );
        res.setHeader("Content-Type", "application/octet-stream");

        response.data.pipe(res);
    } catch (error) {
        console.error("Download failed:", error);
        res.status(500).send("Download failed");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

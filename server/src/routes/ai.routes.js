const express = require("express");
const { authenticateToken, requireRole } = require("../shared/helpers");
const AiStreamController = require("../modules/ai/controllers/ai.stream.controller");
const aiStreamController = new AiStreamController();

const router = express.Router();

// SSE流式API
router.post(
    "/stream",
    authenticateToken,
    requireRole("user"),
    aiStreamController.streamMessage
);

module.exports = router;

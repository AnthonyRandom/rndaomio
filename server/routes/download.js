const express = require('express');
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure tmp directory exists
const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Supported platforms
const SUPPORTED_PLATFORMS = [
  'youtube.com', 'youtu.be',
  'twitter.com', 'x.com',
  'reddit.com',
  'instagram.com',
  'facebook.com', 'fb.com', 'fb.watch',
  'vimeo.com',
  'tiktok.com',
  'twitch.tv',
  'dailymotion.com',
  'soundcloud.com',
  'streamable.com',
  'imgur.com',
  'bilibili.com',
  'bsky.app',
  'loom.com',
  'ok.ru',
  'pinterest.com',
  'newgrounds.com',
  'rutube.ru',
  'snapchat.com',
  'tumblr.com',
  'vk.com',
  'xiaohongshu.com',
  'bandcamp.com',
  'mixcloud.com',
  'threads.net',
  'mastodon.social',
  '9gag.com',
  'deviantart.com',
  'flickr.com'
];

// Validate URL
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Check if platform is supported
function isSupportedPlatform(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase().replace('www.', '');
    return SUPPORTED_PLATFORMS.some(platform => hostname.includes(platform));
  } catch {
    return false;
  }
}

// Get media info endpoint
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`[Download API] Getting info for: ${url}`);

    // Get video info using yt-dlp
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      skipDownload: true,
    });

    // Extract relevant information
    const mediaInfo = {
      title: info.title || 'Unknown',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || '',
      uploader: info.uploader || info.channel || 'Unknown',
      description: info.description?.substring(0, 200) || '',
      formats: info.formats?.length || 0,
      extractor: info.extractor || 'unknown',
      filesize: info.filesize || info.filesize_approx || 0,
      ext: info.ext || 'mp4'
    };

    res.json(mediaInfo);

  } catch (error) {
    console.error('[Download API] Error getting info:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch media information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Download media endpoint
router.post('/download', async (req, res) => {
  const timestamp = Date.now();
  const tmpFilePath = path.join(tmpDir, `download-${timestamp}`);
  let downloadedFile = null;

  try {
    const { url, settings = {} } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate settings
    const validVideoQualities = ['auto', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
    const validVideoCodecs = ['auto', 'h264', 'h265', 'vp9', 'av1'];
    const validContainers = ['auto', 'mp4', 'mkv', 'webm'];
    const validAudioFormats = ['auto', 'mp3', 'aac', 'opus', 'm4a', 'flac'];
    const validAudioBitrates = ['auto', '320', '256', '192', '128', '96'];
    const validFilenameStyles = ['original', 'clean', 'timestamp', 'custom'];

    if (settings.videoQuality && !validVideoQualities.includes(settings.videoQuality)) {
      return res.status(400).json({ error: 'Invalid video quality setting' });
    }
    if (settings.videoCodec && !validVideoCodecs.includes(settings.videoCodec)) {
      return res.status(400).json({ error: 'Invalid video codec setting' });
    }
    if (settings.fileContainer && !validContainers.includes(settings.fileContainer)) {
      return res.status(400).json({ error: 'Invalid file container setting' });
    }
    if (settings.audioFormat && !validAudioFormats.includes(settings.audioFormat)) {
      return res.status(400).json({ error: 'Invalid audio format setting' });
    }
    if (settings.audioBitrate && !validAudioBitrates.includes(settings.audioBitrate)) {
      return res.status(400).json({ error: 'Invalid audio bitrate setting' });
    }
    if (settings.filenameStyle && !validFilenameStyles.includes(settings.filenameStyle)) {
      return res.status(400).json({ error: 'Invalid filename style setting' });
    }

    // Backend validation for impossible combinations (additional to frontend)
    if (settings.audioFormat && settings.audioFormat !== 'auto' &&
        settings.videoQuality && settings.videoQuality !== 'auto') {
      return res.status(400).json({ error: 'Cannot specify both audio format and video quality' });
    }

    if (settings.videoCodec === 'vp9' && settings.fileContainer === 'mp4') {
      return res.status(400).json({ error: 'VP9 codec is not compatible with MP4 container' });
    }

    if (settings.videoCodec === 'av1' && settings.fileContainer === 'mp4') {
      return res.status(400).json({ error: 'AV1 codec is not compatible with MP4 container' });
    }

    console.log(`[Download API] Downloading from: ${url}`);

    // Download options for yt-dlp
    const downloadOptions = {
      output: tmpFilePath + '.%(ext)s',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ],
    };

    // Apply user settings
    const isAudioOnly = settings.audioFormat && settings.audioFormat !== 'auto';
    const isVideo = !isAudioOnly;

    // Audio settings
    if (isAudioOnly) {
      downloadOptions.extractAudio = true;

      // Audio format
      if (settings.audioFormat && settings.audioFormat !== 'auto') {
        downloadOptions.audioFormat = settings.audioFormat;
      } else {
        downloadOptions.audioFormat = 'mp3'; // Default
      }

      // Audio bitrate
      if (settings.audioBitrate && settings.audioBitrate !== 'auto') {
        // Convert to yt-dlp format (0-9 scale, where 0 is best)
        const bitrateMap = {
          '320': 0, '256': 1, '192': 2, '128': 3, '96': 4
        };
        downloadOptions.audioQuality = bitrateMap[settings.audioBitrate] || 0;
      } else {
        downloadOptions.audioQuality = 0; // Best quality
      }

      // For FLAC, don't set quality (always lossless)
      if (settings.audioFormat === 'flac') {
        delete downloadOptions.audioQuality;
      }
    }
    // Video settings
    else {
      // Video quality
      let formatString = 'best';
      if (settings.videoQuality && settings.videoQuality !== 'auto') {
        const qualityMap = {
          '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
          '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
          '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
          '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
          '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
          '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]'
        };
        formatString = qualityMap[settings.videoQuality] || 'best';
      }

      downloadOptions.format = formatString;

      // Video codec preference
      if (settings.videoCodec && settings.videoCodec !== 'auto') {
        const codecMap = {
          'h264': 'avc',
          'h265': 'hevc',
          'vp9': 'vp9',
          'av1': 'av1'
        };
        const codec = codecMap[settings.videoCodec];
        if (codec) {
          downloadOptions.format = `${downloadOptions.format}[vcodec^=${codec}]`;
        }
      }

      // File container/output format
      if (settings.fileContainer && settings.fileContainer !== 'auto') {
        downloadOptions.mergeOutputFormat = settings.fileContainer;
      } else {
        downloadOptions.mergeOutputFormat = 'mp4'; // Default
      }
    }

    // Subtitles
    if (settings.downloadSubtitles) {
      downloadOptions.writeAutoSubs = true;
      downloadOptions.subLang = 'en';
    }

    // Metadata embedding
    if (settings.embedMetadata) {
      downloadOptions.addMetadata = true;
    }

    // Thumbnail embedding (limited support in yt-dlp)
    if (settings.embedThumbnail) {
      downloadOptions.embedThumbnail = true;
    }

    // Execute download
    await youtubedl(url, downloadOptions);

    // Find the downloaded file
    const files = fs.readdirSync(tmpDir);
    
    for (const file of files) {
      if (file.startsWith(`download-${timestamp}`)) {
        downloadedFile = path.join(tmpDir, file);
        break;
      }
    }

    if (!downloadedFile || !fs.existsSync(downloadedFile)) {
      throw new Error('Downloaded file not found');
    }

    // Get file stats
    const stats = fs.statSync(downloadedFile);
    const fileSize = stats.size;

    // Get file extension from the actual downloaded file
    const actualExt = path.extname(downloadedFile);
    let ext = actualExt || '.mp4'; // Default to .mp4 if no extension found

    try {
      // Try to get original title and format info
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        skipDownload: true,
      });

      // Use the actual extension from yt-dlp if available
      if (info.ext) {
        ext = '.' + info.ext;
      }
    } catch (e) {
      console.warn('[Download API] Could not fetch title, using generic filename');
    }

    // Create filename with title if available
    let filename = `download${ext}`;
    let title = null;
    try {
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        skipDownload: true,
      });

      title = info.title;

      if (title) {
        // Apply filename style
        let finalTitle = title;

        if (settings.filenameStyle && settings.filenameStyle !== 'original') {
          // Clean special characters
          if (settings.filenameStyle === 'clean' || settings.filenameStyle === 'timestamp') {
            finalTitle = title.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
            finalTitle = finalTitle.replace(/\s+/g, '_');
          }

          // Add timestamp for timestamp style
          if (settings.filenameStyle === 'timestamp') {
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
            finalTitle = `${timestamp}_${finalTitle}`;
          }
        }

        // Sanitize the final title for use as filename
        const sanitizedTitle = finalTitle
          .replace(/[^\x20-\x7E]/g, '') // Remove all non-ASCII characters
          .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Remove additional invalid characters
          .replace(/[/\\]/g, '-')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .substring(0, 150); // Reasonable length limit

        if (sanitizedTitle.length > 0) {
          filename = sanitizedTitle + ext;
        }
      }
    } catch (e) {
      console.warn('[Download API] Could not fetch title, using generic filename');
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/octet-stream');

    // Use a more compatible filename approach
    // Create a safe ASCII-only filename for broader browser compatibility
    const safeFilename = filename
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace any remaining non-alphanumeric chars except dash, underscore, dot
      .substring(0, 100); // Reasonable filename length

    // Ensure we have an extension
    const finalFilename = safeFilename.includes('.') ? safeFilename : 'download' + ext;

    console.log(`[Download API] Sending file: ${finalFilename} (${fileSize} bytes)`);

    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('X-Original-URL', url);
    res.setHeader('X-File-Size', fileSize.toString());

    // Stream file to response
    const fileStream = fs.createReadStream(downloadedFile);
    fileStream.pipe(res);

    // Cleanup after streaming
    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          if (downloadedFile && fs.existsSync(downloadedFile)) {
            fs.unlinkSync(downloadedFile);
          }
        } catch (err) {
          console.warn('[Download API] Cleanup failed:', err.message);
        }
      }, 1000);
    });

    // Handle streaming errors
    fileStream.on('error', (err) => {
      console.error('[Download API] Stream error:', err.message);
      try {
        if (downloadedFile && fs.existsSync(downloadedFile)) {
          fs.unlinkSync(downloadedFile);
        }
      } catch (cleanupErr) {
        console.warn('[Download API] Cleanup failed:', cleanupErr.message);
      }
    });

  } catch (error) {
    console.error('[Download API] Download failed:', error.message);

    // Cleanup on error
    try {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        if (file.startsWith(`download-${timestamp}`)) {
          fs.unlinkSync(path.join(tmpDir, file));
        }
      }
    } catch (err) {
      console.warn('[Download API] Cleanup failed:', err.message);
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Provide more helpful error messages
    let errorMessage = 'Download failed. The URL may not be supported or the media may not be available.';
    
    if (error.message.includes('Unsupported URL')) {
      errorMessage = 'This URL is not supported. Please check that the link is from a supported platform.';
    } else if (error.message.includes('Video unavailable')) {
      errorMessage = 'The video is unavailable. It may be private, deleted, or region-restricted.';
    } else if (error.message.includes('HTTP Error 404')) {
      errorMessage = 'Media not found (404). The content may have been removed or the link is incorrect.';
    } else if (error.message.includes('HTTP Error 403')) {
      errorMessage = 'Access forbidden (403). The content may be private or require authentication.';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: isDevelopment ? error.message : undefined
    });
  }
});

module.exports = router;

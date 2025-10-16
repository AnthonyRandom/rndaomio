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
    const { url, format = 'best' } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
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

    // Set format based on request
    if (format === 'audio') {
      downloadOptions.extractAudio = true;
      downloadOptions.audioFormat = 'mp3';
      downloadOptions.audioQuality = 0; // Best quality
    } else if (format === 'video') {
      downloadOptions.format = 'bestvideo+bestaudio/best';
      downloadOptions.mergeOutputFormat = 'mp4';
    } else {
      // Default to best quality with mp4 output format for better compatibility
      downloadOptions.format = 'best';
      downloadOptions.mergeOutputFormat = 'mp4';
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
    try {
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        skipDownload: true,
      });

      if (info.title) {
        // Sanitize the title for use as filename (remove all non-ASCII characters for HTTP headers)
        const sanitizedTitle = info.title
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

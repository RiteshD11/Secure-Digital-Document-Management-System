package com.security_management.backend.validation;

import com.security_management.backend.exception.InvalidFileException;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Service
public class FileValidationService {

    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(Arrays.asList(
            "pdf", "docx", "jpg", "jpeg", "png", "txt"
    ));

    private static final Set<String> ALLOWED_MIME_TYPES = new HashSet<>(Arrays.asList(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
            "text/plain"
    ));

    private final Tika tika = new Tika();

    public void validateFile(MultipartFile file) {
        // 1. File exists
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Upload rejected: File must exist and cannot be empty.");
        }

        // 2. File isn't empty
        if (file.getSize() <= 0) {
            throw new InvalidFileException("Upload rejected: File size must be greater than 0 bytes.");
        }

        // 3. File size check
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("Upload rejected: File size exceeds the maximum allowed limit of 100 MB.");
        }

        // 4. Filename & Extension sanitization
        String rawFilename = file.getOriginalFilename();
        if (rawFilename == null || rawFilename.trim().isEmpty()) {
            throw new InvalidFileException("Upload rejected: Original filename cannot be empty.");
        }

        String sanitizedFilename = sanitizeFilename(rawFilename);
        String extension = getFileExtension(sanitizedFilename);

        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase(Locale.ROOT))) {
            throw new InvalidFileException(String.format(
                    "Upload rejected: Unsupported file extension '.%s'. Allowed extensions are: %s",
                    extension != null ? extension : "none",
                    ALLOWED_EXTENSIONS
            ));
        }

        // 5. Deep MIME type inspection using Apache Tika (magic bytes verification)
        try (InputStream inputStream = file.getInputStream()) {
            String detectedMime = tika.detect(inputStream, sanitizedFilename);
            if (detectedMime == null || !isMimeTypeAllowed(detectedMime, extension)) {
                throw new InvalidFileException(String.format(
                        "Upload rejected: Content inspection failed. Detected MIME type '%s' does not match allowed types or extension '.%s'.",
                        detectedMime,
                        extension
                ));
            }
        } catch (IOException e) {
            throw new InvalidFileException("Upload rejected: Failed to read file content for MIME inspection: " + e.getMessage());
        }
    }

    public String sanitizeFilename(String filename) {
        // Prevent path traversal attacks like ../../secret.pdf
        String cleanName = Paths.get(filename).getFileName().toString();
        // Remove null bytes and control chars
        cleanName = cleanName.replaceAll("[\\r\\n\\u0000]", "");
        // Remove illegal characters
        cleanName = cleanName.replaceAll("[^a-zA-Z0-9._\\- ]", "_");
        if (cleanName.trim().isEmpty()) {
            cleanName = "document_" + System.currentTimeMillis();
        }
        return cleanName;
    }

    public String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return null;
        }
        return filename.substring(lastDotIndex + 1).toLowerCase(Locale.ROOT);
    }

    public String detectMimeType(byte[] data, String filename) {
        return tika.detect(data, filename);
    }

    /**
     * Checks if two file extensions are compatible (e.g. txt == txt, or jpg == jpeg).
     */
    public boolean areExtensionsCompatible(String ext1, String ext2) {
        if (ext1 == null || ext2 == null) {
            return false;
        }
        String e1 = ext1.trim().toLowerCase(Locale.ROOT);
        String e2 = ext2.trim().toLowerCase(Locale.ROOT);
        if (e1.equals(e2)) {
            return true;
        }
        // JPEG/JPG equivalence
        if (("jpg".equals(e1) || "jpeg".equals(e1)) && ("jpg".equals(e2) || "jpeg".equals(e2))) {
            return true;
        }
        return false;
    }

    /**
     * Strict validation: Version N must match the file extension of Version 1.
     */
    public void validateVersionExtensionMatch(String originalFilename, String newFilename) {
        String expectedExt = getFileExtension(originalFilename);
        String newExt = getFileExtension(newFilename);

        if (!areExtensionsCompatible(expectedExt, newExt)) {
            throw new InvalidFileException(String.format(
                    "Upload rejected: File type mismatch. Previous version is '%s' (.%s), but the uploaded version is '%s' (.%s). All versions of a document must have the same file type.",
                    originalFilename,
                    expectedExt != null ? expectedExt : "unknown",
                    newFilename,
                    newExt != null ? newExt : "unknown"
            ));
        }
    }

    private boolean isMimeTypeAllowed(String detectedMime, String extension) {
        // Exact match check
        if (ALLOWED_MIME_TYPES.contains(detectedMime)) {
            return true;
        }
        // Text plain or octet stream text files
        if ("txt".equalsIgnoreCase(extension) && (detectedMime.startsWith("text/") || "application/octet-stream".equals(detectedMime))) {
            return true;
        }
        // JPEG variations
        if (("jpg".equalsIgnoreCase(extension) || "jpeg".equalsIgnoreCase(extension)) && detectedMime.startsWith("image/jp")) {
            return true;
        }
        return false;
    }
}

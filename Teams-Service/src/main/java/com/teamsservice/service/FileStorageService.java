package com.teamsservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    @Value("${app.nfs.teams-directory}")
    private String teamsDirectory;

    @Value("${app.nfs.allowed-extensions}")
    private String allowedExtensions;

    @Value("${app.nfs.max-file-size}")
    private long maxFileSize;

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * Saves a team logo file to NFS storage
     * @param file The uploaded file
     * @param teamId The team ID
     * @return The relative path where the file was saved
     */
    public String saveTeamLogo(MultipartFile file, Long teamId) throws IOException {
        validateFile(file);

        // Create directory structure if it doesn't exist
        Path teamLogoDir = Paths.get(teamsDirectory, teamId.toString());
        if (!Files.exists(teamLogoDir)) {
            Files.createDirectories(teamLogoDir);
            log.info("Created directory: {}", teamLogoDir);
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        String filename = String.format("%d-%s.%s", teamId, timestamp, extension);

        // Save file
        Path filePath = teamLogoDir.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        log.info("Saved team logo: {}", filePath);
        
        // Return relative path for storage in database
        return String.format("teams/logos/%d/%s", teamId, filename);
    }

    /**
     * Deletes a team logo file from NFS storage
     * @param logoPath The relative path of the logo
     */
    public void deleteTeamLogo(String logoPath) {
        if (logoPath == null || logoPath.isEmpty()) {
            return;
        }

        try {
            Path base = Paths.get(teamsDirectory);
            // logoPath stored as "teams/logos/{teamId}/{filename}"
            String prefix = "teams/logos/";
            Path filePath;
            if (logoPath.startsWith(prefix)) {
                String rel = logoPath.substring(prefix.length());
                filePath = base.resolve(rel);
            } else {
                // Fallback: treat as direct path
                filePath = Paths.get(logoPath);
            }

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted team logo: {}", filePath);
            }
        } catch (IOException e) {
            log.error("Error deleting team logo: {}", logoPath, e);
            // Don't throw exception - deletion failure shouldn't prevent team deletion
        }
    }

    /**
     * Validates the uploaded file
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException(
                String.format("File size exceeds maximum allowed size of %d bytes", maxFileSize)
            );
        }

        String extension = getFileExtension(file.getOriginalFilename());
        List<String> allowed = Arrays.asList(allowedExtensions.split(","));
        
        if (!allowed.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException(
                String.format("File type not allowed. Allowed types: %s", allowedExtensions)
            );
        }
    }

    /**
     * Extracts file extension from filename
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new IllegalArgumentException("Invalid filename");
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }
}

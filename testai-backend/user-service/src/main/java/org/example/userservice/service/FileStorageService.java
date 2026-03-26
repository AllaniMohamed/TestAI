package org.example.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.userservice.config.FileStorageConfig;
import org.example.userservice.exception.FileStorageException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Service pour gérer le stockage des fichiers (avatars)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FileStorageService {

    private final FileStorageConfig fileStorageConfig;
    private Path fileStorageLocation;

    /**
     * Initialiser le dossier de stockage au démarrage
     */
    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(fileStorageConfig.getDir())
                .toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
            log.info("✅ Dossier de stockage créé/vérifié: {}", this.fileStorageLocation);
        } catch (Exception ex) {
            throw new FileStorageException("Impossible de créer le dossier de stockage", ex);
        }
    }

    /**
     * Stocker un avatar et retourner le nom du fichier
     */
    public String storeAvatar(MultipartFile file) {
        // 1. Valider le fichier
        validateFile(file);

        // 2. Générer un nom de fichier unique
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = getFileExtension(originalFilename);
        String newFileName = UUID.randomUUID().toString() + fileExtension;

        try {
            // 3. Vérifier qu'il n'y a pas de caractères invalides
            if (newFileName.contains("..")) {
                throw new FileStorageException("Le nom de fichier contient une séquence de chemin invalide: " + newFileName);
            }

            // 4. Copier le fichier vers le dossier de destination
            Path targetLocation = this.fileStorageLocation.resolve(newFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            log.info("✅ Avatar stocké: {} (taille: {} bytes)", newFileName, file.getSize());
            return newFileName;

        } catch (IOException ex) {
            throw new FileStorageException("Impossible de stocker le fichier " + newFileName, ex);
        }
    }

    /**
     * Charger un fichier comme ressource
     */
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return resource;
            } else {
                throw new FileStorageException("Fichier non trouvé: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new FileStorageException("Fichier non trouvé: " + fileName, ex);
        }
    }

    /**
     * Supprimer un ancien avatar
     */
    public void deleteAvatar(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return;
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
            log.info("🗑️ Avatar supprimé: {}", fileName);
        } catch (IOException ex) {
            log.warn("⚠️ Impossible de supprimer l'avatar: {}", fileName);
        }
    }

    /**
     * Obtenir l'URL complète d'un avatar
     */
    public String getAvatarUrl(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return null;
        }
        return fileStorageConfig.getBaseUrl() + "/" + fileName;
    }

    /**
     * Extraire le nom de fichier de l'URL complète
     */
    public String extractFileNameFromUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isEmpty()) {
            return null;
        }
        return avatarUrl.substring(avatarUrl.lastIndexOf("/") + 1);
    }

    // ========================================
    // MÉTHODES PRIVÉES - VALIDATION
    // ========================================

    /**
     * Valider le fichier uploadé
     */
    private void validateFile(MultipartFile file) {
        // Vérifier que le fichier n'est pas vide
        if (file.isEmpty()) {
            throw new FileStorageException("Le fichier est vide");
        }

        // Vérifier la taille (max 5MB déjà géré par Spring, mais double-check)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new FileStorageException("La taille du fichier dépasse 5MB");
        }

        // Vérifier le type MIME (images uniquement)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new FileStorageException("Seules les images sont autorisées (PNG, JPG, JPEG, GIF)");
        }

        // Vérifier l'extension
        String filename = file.getOriginalFilename();
        if (filename == null || !isValidImageExtension(filename)) {
            throw new FileStorageException("Extension de fichier non autorisée. Utilisez PNG, JPG, JPEG ou GIF");
        }
    }

    /**
     * Vérifier si l'extension est valide
     */
    private boolean isValidImageExtension(String filename) {
        String extension = getFileExtension(filename).toLowerCase();
        return extension.equals(".png") ||
                extension.equals(".jpg") ||
                extension.equals(".jpeg") ||
                extension.equals(".gif");
    }

    /**
     * Obtenir l'extension du fichier
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }
}
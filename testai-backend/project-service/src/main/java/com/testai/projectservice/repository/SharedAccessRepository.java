package com.testai.projectservice.repository;

import com.testai.projectservice.entity.SharedAccess;
import com.testai.projectservice.entity.AccessStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SharedAccessRepository extends JpaRepository<SharedAccess, UUID> {

    Optional<SharedAccess> findByInvitationToken(String invitationToken);

    List<SharedAccess> findByProjectId(UUID projectId);

    List<SharedAccess> findByUserId(UUID userId);

    List<SharedAccess> findByUserIdAndStatus(UUID userId, AccessStatus status);

    Optional<SharedAccess> findByProjectIdAndUserIdAndStatus(
            UUID projectId,
            UUID userId,
            AccessStatus status
    );

    // ⭐ NOUVEAU : Chercher par email au lieu de userId
    Optional<SharedAccess> findByProjectIdAndDeveloperEmailAndStatus(
            UUID projectId,
            String developerEmail,
            AccessStatus status
    );

    List<SharedAccess> findBySharedBy(UUID managerId);
    List<SharedAccess> findByDeveloperEmailAndUserIdIsNull(String email);
    /**
     * ⭐ Supprimer tous les partages d'un projet
     * Retourne le nombre de partages supprimés
     */
    int deleteByProjectId(UUID projectId);

    @Query("SELECT s.projectId FROM SharedAccess s WHERE s.sharedBy = :userId OR s.userId = :userId")
    List<UUID> findUserProjects(@Param("userId") UUID userId);
}
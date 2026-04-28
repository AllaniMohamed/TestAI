package com.testai.notificationservice.repository;

import com.testai.notificationservice.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(UUID userId);

    List<Notification> findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);

    long countByRecipientUserIdAndIsReadFalse(UUID userId);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipientUserId = :userId")
    void markAllAsReadByUserId(UUID userId);
}
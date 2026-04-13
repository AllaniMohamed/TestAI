package com.testai.blogapi.repository;

import com.testai.blogapi.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByArticleId(Long articleId);
    List<Comment> findByApproved(Boolean approved);
    List<Comment> findByArticleIdAndApproved(Long articleId, Boolean approved);
}
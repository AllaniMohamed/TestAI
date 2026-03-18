package com.testai.projectservice.controller;

import com.testai.projectservice.dto.ActivateInvitationResponse;
import com.testai.projectservice.dto.InvitationInfoDTO;
import com.testai.projectservice.service.SharedAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final SharedAccessService sharedAccessService;

    /**
     * Récupérer les infos d'une invitation (PUBLIC)
     */
    @GetMapping("/{token}")
    public ResponseEntity<InvitationInfoDTO> getInvitationInfo(@PathVariable String token) {
        InvitationInfoDTO info = sharedAccessService.getInvitationInfo(token);
        return ResponseEntity.ok(info);
    }

    /**
     * Activer une invitation (PUBLIC)
     * ⭐ Retourne si le développeur a un compte ou pas
     */
    @PostMapping("/{token}/activate")
    public ResponseEntity<ActivateInvitationResponse> activateInvitation(@PathVariable String token) {
        ActivateInvitationResponse response = sharedAccessService.activateInvitation(token);
        return ResponseEntity.ok(response);
    }
}
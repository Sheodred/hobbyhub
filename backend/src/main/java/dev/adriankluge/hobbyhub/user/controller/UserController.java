package dev.adriankluge.hobbyhub.user.controller;

import dev.adriankluge.hobbyhub.auth.dto.UserResponse;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.filter.AuthenticatedUser;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import dev.adriankluge.hobbyhub.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return UserResponse.from(loadUser(principal));
    }

    @PatchMapping
    public UserResponse updateMe(
            @AuthenticationPrincipal AuthenticatedUser principal, @Valid @RequestBody UpdateProfileRequest request) {
        User user = loadUser(principal);
        user.setDisplayName(request.displayName());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    private User loadUser(AuthenticatedUser principal) {
        return userRepository
                .findById(principal.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}

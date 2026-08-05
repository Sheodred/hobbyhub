package dev.adriankluge.hobbyhub.user.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.auth.entity.Role;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.filter.AuthenticatedUser;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import dev.adriankluge.hobbyhub.user.dto.UpdateProfileRequest;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Test
    void updatingTheProfilePersistsTheChangeAndReturnsIt() {
        User user = new User("owner@example.com", "hash", "Original Name");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), Role.USER);

        UserController controller = new UserController(userRepository);
        var response = controller.updateMe(principal, new UpdateProfileRequest("New Name"));

        assertEquals("New Name", response.displayName());
        // Regression guard: this project has previously shipped an update endpoint that
        // mutated the JPA entity in memory but never called repository.save(), so the
        // response looked correct while nothing actually persisted (marketplace listings,
        // see ListingServiceTest). Assert save() was actually invoked, not just the response.
        verify(userRepository, times(1)).save(user);
        assertEquals("New Name", user.getDisplayName());
    }

    @Test
    void throws404WhenTheAuthenticatedUserNoLongerExists() {
        UUID missingId = UUID.randomUUID();
        when(userRepository.findById(missingId)).thenReturn(Optional.empty());
        AuthenticatedUser principal = new AuthenticatedUser(missingId, "ghost@example.com", Role.USER);

        UserController controller = new UserController(userRepository);

        assertThrows(ResponseStatusException.class, () -> controller.me(principal));
    }
}

These nine profile folders are placeholders only.

Logged-in ChatGPT browser sessions are not bundled from the source machine.
Reason: Windows browser profile encryption (DPAPI) is machine/user bound,
so copying logged-in profiles to another Windows Server is not treated as reliable.

On the target Windows Server:
1. Use the same worker IDs: dad, wife, shared-1, shared-2, shared-3, shared-4, shared-5, shared-6, shared-7
2. Start each worker on demand
3. Log in manually once in that server session

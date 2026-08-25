# Pi Harness Configuration

This directory contains safe-to-version Pi harness configuration.

Do not store OAuth tokens, provider API keys, session files, or provider caches
here.

The baseline extension slots are:

1. bash guard
2. file-changes log with undo
3. ask-user tool
4. memory toggle

The concrete extension implementations are installed and validated only after
Pi itself is installed and its extension API/version is confirmed against the
pinned Pi package.

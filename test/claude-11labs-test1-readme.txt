claude-11labs-test1
Purpose of the claude-11labs-test1 file:
This script serves as a testing utility to:
    Verify Integration: Test if the Claude AI and ElevenLabs text-to-speech services are working together correctly
    Generate Audio Samples: Create audio files from predefined test prompts
    Performance Testing: Measure how long the complete process take
    Error Handling: Identify any issues in the integration pipeline
    Documentation: Create audio files for review and quality assessment

How it works:
    Test Setup: Creates an output directory for storing generated audio files
    Prompt Processing: Sends emotional support-related prompts to the Claude AI service
    Speech Synthesis: Converts Claude's text responses to speech using ElevenLabs TTS
    File Output: Saves the generated audio as MP3 files with names based on the prompts
    Performance Tracking: Measures and reports the time taken for each test
    Result Reporting: Provides a summary table of test results including success rate and timing

How to use:
    Ensure the required environment variables are set for both Claude and ElevenLabs services
    Run the script from the command line:
    node 11labs-test1.js
    The script will:
    Process each test prompt
    Print Claude's text responses to the console
    Save audio files to the 'output' directory
    Display a summary table with test results

Example output:
===== Testing: Hi there, I'm feeling a bit down today. =====
Testing prompt: "Hi there, I'm feeling a bit down today."
----- Claude Response -----
I'm sorry to hear you're feeling down today. That's completely understandable - we all have days when our mood isn't at its best. Would you like to talk about what's been going on? Sometimes just expressing what's bothering you can help a little.
If you'd prefer, we could also discuss some simple things that might help lift your mood - like taking a short walk, connecting with a friend, or doing a small activity you normally enjoy. Is there anything specific you think might help right now?
--------------------------
Audio saved to: output/hi-there-i-m-feelin-1620847329456.mp3 (98742 bytes)
===== Test Summary =====
┌─────────┬────────────────────────────────────────────┬─────────┬──────────┬────────────────────────────────────────────────┐
│ (index) │                  prompt                    │ success │ duration │                 outputFile                      │
├─────────┼────────────────────────────────────────────┼─────────┼──────────┼────────────────────────────────────────────────┤
│    0    │ "Hi there, I'm feeling a bit down today."  │  true   │  "3.45s" │ "output/hi-there-i-m-feelin-1620847329456.mp3" │
│    1    │ "I've been feeling overwhelmed with work." │  true   │  "2.87s" │ "output/i-ve-been-feeling-ov-1620847332341.mp3"│
└─────────┴────────────────────────────────────────────┴─────────┴──────────┴────────────────────────────────────────────────┘
Dependencies:
    fs: File system operations for creating directories and saving files
    path: Handling file paths
    aiIntegration utility: Contains the getClaudeAndSpeechWithCache function

Test prompts:
    The script includes the following test prompts focused on emotional support scenarios:
    "Hi there, I'm feeling a bit down today."
    "I've been feeling overwhelmed with work lately."

Output files:
    Audio files are saved to the 'output' directory
    Filenames are based on sanitized versions of the prompts with timestamps
    Files are in MP3 format

Performance metrics:
    Duration: Time taken for the complete process (AI response + speech synthesis)
    Success rate: Whether audio was successfully generated for each prompt

Troubleshooting:
    If a test fails, detailed error information is logged to the console
    API response data is included when available for debugging
    A summary table indicates which specific tests succeeded or failed

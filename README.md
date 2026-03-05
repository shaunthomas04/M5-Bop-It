# Bluetooth Bop-It – M5Core2 Multiplayer Game

## Overview

Bluetooth Bop-It is a multiplayer reaction game inspired by the classic **Bop-It** toy. The game uses **two devices connected via Bluetooth Low Energy (BLE)**:

* **Phone** – controls the game session and sends commands
* **M5Core2** – displays commands and detects player actions using its hardware (touchscreen, buttons, and motion sensors)

Players must quickly perform the correct action on the M5Core2. If a player performs the wrong action or fails to respond before time runs out, they are eliminated. The game continues until **only one player remains**.

---

## Gameplay Loop

1. **Game Setup**

   * The phone starts a session.
   * The user enters player names and selects a game mode.

2. **Command Sent**

   * The phone selects a player and a command.
   * The command is sent to the M5Core2 via BLE.

3. **Player Action**

   * The M5Core2 displays the player name and instruction (e.g., “Alex – SHAKE IT!”).
   * The player must perform the correct action using the device hardware such as:

     * tapping the touchscreen
     * pressing a button
     * shaking or tilting the device

4. **Input Validation**

   * The M5Core2 detects the input and sends the result back to the phone.

5. **Elimination**

   * If the player performs the wrong action or runs out of time, they are eliminated.
   * The game continues with the remaining players.

6. **Game End**

   * The loop repeats until one player remains.
   * The M5Core2 displays the winner.

---

## Game Modes

### Random Mode

In Random Mode, the phone automatically selects:

* a random player
* a random command
* a reaction time limit

This creates a continuous gameplay loop where commands are issued automatically and players must react quickly.

---

### Taskmaster Mode

In Taskmaster Mode, one person acts as the **Taskmaster** using the phone interface.

Instead of random commands, the Taskmaster manually selects:

* which player must respond
* which command must be performed

The phone then sends that instruction to the M5Core2, where the player must perform the action. This mode allows a human controller to create unpredictable or challenging commands during gameplay.

---

## Hardware Interaction

The M5Core2 simulates the feel of a Bop-It device by using multiple hardware inputs, including:

* Touchscreen gestures
* Physical buttons
* Motion sensors (shake, tilt, or rotation)

Each command corresponds to one of these actions, creating a fast-paced reaction game.

---

## End Condition

Players are eliminated when they fail to perform the correct action in time. The game continues until **one player remains**, and that player is declared the winner.

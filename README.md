# 🔥 Bonfire
A real-time group chat application with a chaotic, context-aware AI participant.


## 🤔 What is this?

Most chat apps are boring utilities. Bonfire is a social experiment.

It features all the standard real-time messaging capabilities you'd expect, plus one major twist: **Bonfire (The Bot)**. She isn't a helpful assistant. She doesn't want to write your emails. She is a "ride-or-die" best friend who is equally likely to support you through a breakup or humble you for skipping leg day.

Built with **Next.js 16** and **Supabase**, featuring a custom **Dual-Stage AI Architecture** that gives the bot "social intuition" rather than just robotic responses

## 🚀 Key Features

### 🤖 The "Bonfire" Persona

A fully integrated AI chat participant. She doesn't just respond to commands; she reads the room.

-   **Context Aware:** She knows the difference between "I hate you" (banter) and "I hate myself" (sadness).
    
-   **The "Humble" Mechanic:** If you brag about your gym PR or your startup idea, she _will_ roast you.
    
-   **Dead Chat Revival:** If the group goes silent for 24 hours, she wakes up and chooses violence to start a conversation.

### 🧠 Dual-Stage "Brain" Architecture

We don't just send text to an LLM. We process it first.

-  **The Analyzer (Stage 1):** A lightweight Gemini 2.0 Flash call analyzes the _intent_ of every message (Flex, Roast, Sadness, Question) and outputs raw JSON.
    
-  **The Logic Gate:** A TypeScript layer decides if the bot _should_ care. (She ignores boring small talk).
    
-  **The Performer (Stage 2):** If triggered, a second LLM call generates the response with a dynamically injected "Director's Note" based on the analysis.

### 🕵️‍♂️ Incognito Mode & Privacy

-   **Toggle-able AI:** Don't want the bot in a specific room? Don't invite her.
    
-   **"Ghost" Messages:** Even if the bot is in the room, you can toggle "Incognito Mode" to send messages she can't see. Perfect for gossiping about the AI right in front of her face.
    

### 🔍 Weaponized Google Search

Bonfire has access to real-time Google Search data.

-   **Fact Checking:** If you claim a specific stat, she checks it. If you're lying, she exposes you.
    
-   **Lazy Shaming:** If you ask a question like "What is the capital of Peru?", she answers it but mocks you for not Googling it yourself.
    

### ⚡ Real-Time Infrastructure

-   **Supabase Realtime:** Messages sync instantly across clients.
    
-   **Room Management:** Create private rooms, generate unique invite links, and revoke/refresh them instantly to keep unwanted guests out.


## 🛠️ Tech Stack

-   **Frontend:** Next.js 16 (App Router), Tailwind CSS
    
-   **Backend:** Supabase (PostgreSQL, Auth, Realtime Subscriptions)
    
-   **AI:** Google Gemini 2.0 Flash (via Google AI SDK)
    
-   **Deployment:** Vercel

## 📦 Getting Started

1.  **Clone the repo**
	```Bash
	git clone https://github.com/yourusername/bonfire.git
	cd bonfire
	```
2. **Install dependencies**
    
    
    ```    Bash
    pnpm install
    
    ```
    
3. **Environment Setup** Create a `.env.local` file:
    

    
    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_*******
    GEMINI_API_KEY=your_google_ai_key
    SUPABASE_SECRET_KEY=sb_secret_*******
    ```
    
4. **Run Development Server**
    
    
    
    ```Bash
    pnpm dev
    ```
## 🔮 Roadmap

-   [ ] **Multimodal Roasting:** Allow Bonfire to "see" images so she can critique your dinner or your setup.
    
-   [ ] **Long-Term Memory:** Implement Vector Embeddings (RAG) so she remembers that time you failed your driving test 3 months ago.
    
-   [ ] **The "Burn Book":** A leaderboard dashboard for the most roasted users in the chat.
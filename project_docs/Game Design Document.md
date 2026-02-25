# **Game Design Document: Project Hex-Fit (Core System)**

**Core Theme:** The Worldhopper (Interdimensional Traveler)

**Core Concept:** A web-based, gamified habit tracker where your persistent character travels through the multiverse. Real-world physical and wellness activities fuel your journey across different realities. Every 90 days, you enter a new "Module" or "Realm" (e.g., a JRPG fantasy world, a cyberpunk city, a haunted forest), allowing continuous leveling across ever-changing campaigns.

## **1\. The Core Loop & Pacing**

The game is designed around 90-day (Quarterly) "Modules" represented by a single Hexagonal Map within a specific dimension.

* **Target Pacing:** 3-6 Hex Movements per week. 2-3 Encounter Combats per week.  
* **The Loop:**  
  1. **Log Activity:** User logs a workout or wellness activity.  
  2. **Generate Resource:** The app converts the activity into a universal Worldhopper token/stat.  
  3. **Act on Map:** User spends tokens to reveal hexes, travel, or overcome local dimensional obstacles.  
  4. **Loot & Reward:** Clearing encounters yields universal Currency and Realm-specific Crafting Materials.  
  5. **Real-World Payoff:** Currency is spent in the Nexus Tent to buy real-world treats.

## **2\. Activity Translation (The Engine)**

Real-world efforts are standardized so no specific workout is unfairly penalized. These are the energies you use to manipulate reality.

* **Cardio (Biking, Hiking, Running): Generates *Slipstream Tokens*.**  
  * *Conversion:* 20 minutes of intentional cardio \= 1 Slipstream Token (moves 1 Hex).  
* **Strength/Combat (Weights, Boxing, Krav Maga): Generates *Power Strikes*.**  
  * *Conversion:* 15 minutes of strength/combat \= 1 Strike. A 45-minute class yields 3 Strikes, allowing Elites to be defeated in a single, intense session.  
* **Yoga/Mobility: Generates *Wards (Flow)*.**  
  * *Conversion:* Builds defensive charges to block damage from missed days or boss attacks.  
* **Wellness (Meditation, Real-World Healthy Cooking): Generates *Aether/Focus & Crafting*.**  
  * *Conversion:* Restores HP/Aether or allows the crafting of buffs from local Encounter Drops at your Basecamp.

## **3\. Playbooks (Persistent Classes)**

Powered by the Apocalypse (PbtA) style. Characters have four core stats ranging from \-1 to \+3: **Brawn, Flow, Haste, Focus**.

*Your character and class persist across all 90-day modules, allowing you to build a powerful interdimensional traveler over time.*

### **The Rift-Weaver (The Caster/Controller)**

*Manipulates the fabric of reality, fortifies the interdimensional basecamp, and evades danger using cosmic energy, magic, or advanced tech.*

* **Stats:** Flow \+2, Focus \+1, Haste \+0, Brawn \-1  
* **Starting Moves (Choose 1):**  
  * *Aether Shield:* 20 mins of Yoga grants 1 Ward. Spend a Ward to absorb a local entity's attack completely.  
  * *Nexus Synthesizer:* Log a healthy home-cooked meal to convert local drops into a *Restorative Consumable* (Refills Aether or grants \+1 Haste for next cardio session).  
  * *Dimensional Anchor:* Spend 1 Focus (earned via meditation) to lock down an Elite/Boss, reducing its required Strikes by 1\.

### **The Gate-Crasher (The Fighter/Bruiser)**

*A front-line powerhouse who uses brute force, martial arts, or heavy weaponry to shatter the barriers between worlds and crush obstacles.*

* **Stats:** Brawn \+2, Haste \+1, Flow \+0, Focus \-1  
* **Starting Moves (Choose 1):**  
  * *Momentum Strike:* Logging a 45+ minute strength/martial arts class grants an automatic bonus \+1 Strike to your target.  
  * *Aura of Conquest:* Logging an in-person, professional class forces all adjacent basic mobs to flee, leaving their loot behind.  
  * *Defy Reality:* If your HP reaches zero, permanently sacrifice 1 piece of Loot to stay at 1 HP and immediately strike back.

### **The Wayfinder (The Rogue/Explorer)**

*Master of the multiverse grid, relying on steady momentum and reconnaissance to navigate the slipstream between timelines.*

* **Stats:** Haste \+2, Flow \+1, Brawn \+0, Focus \-1  
* **Starting Moves (Choose 1):**  
  * *Scout the Multiverse:* Taking a pet on a dedicated walk generates a *Scout Token*, allowing you to reveal an adjacent hex without moving into it.  
  * *Slipstream Surge:* When biking, activate this to leap 2 hexes in a straight line, ignoring basic encounter tiles in your path.  
  * *Phase Strike:* Spend 2 Slipstream Tokens (Cardio) to deal 1 Strike to an obstacle through interdimensional evasion, bypassing the need for a Strength workout.

## **4\. Map Nodes & Encounters**

The Map contains roughly 60-75 landable hexes, themed to the current 90-day Realm. Moving into a Fog of War hex reveals its contents.

* **Basic Encounter (1 Strike):** A local threat (e.g., Slime, Security Drone, Zombie). Drops: Minor Currency, Materials.  
* **Elite Encounter (3 Strikes):** A dangerous local entity (e.g., Golem, Alien Hunter, Vampire). Drops: Moderate Currency, Consumable Item.  
* **Realm Boss (5 Strikes):** The ultimate threat of this dimension (e.g., Archive Dragon, Mech Commander). Drops: Major Currency, Unique Artifact (+1 permanent stat).  
* **Dimensional Anomalies (Stat Obstacles):** Non-combat encounters. Requires spending non-Brawn resources to overcome (e.g., Spend 2 Wards/Flow to bypass a trapped laser grid, or 2 Focus to decipher an ancient terminal). Reward: Unique Lore, Currency, or a temporary buff.  
* **TTRPG Rifts (Themed Adventures):** Deep fractures in reality that let you "play" through the settings of your real-world TTRPG books. Landing here starts a multi-day, text-based mini-campaign set in a specific book's universe (e.g., an Obojima spirit hunt). Requires a mix of various logged workouts/stats to progress through the story beats. Reward: Heavily Themed Artifacts and massive XP.  
* **The Worldhopper Dojo:** *Optional.* You can safely move past this node without engaging. However, if you choose to clear it by logging an *in-person* class (Yoga studio, Krav Maga), the rewards are immense. **Reward:** Unlocks a new Playbook Move (Limit Break) and grants \+2 XP.  
* **Convergence Event (Grand Expedition):** *Optional.* A towering dimensional milestone that does not block standard travel. Clearing it requires completing a major external event (5K, Conqueror Challenge). **Reward:** Massive AoE map reveal, Legendary Interdimensional Loot, and \+5 XP.

## **5\. Loot & The Merchant Tent (Real-World Integration)**

In-game Currency dictates real-world wellness and physical hobby spending. Players stock the tent themselves with rewards tailored to their goals.

* **50 Currency:** A fancy bath product (e.g., Lush bath bomb, fancy Epsom salts).  
* **150 Currency:** A drop-in personal sauna visit.  
* **300 Currency:** New workout clothes or gear.  
* **500 Currency:** A month of a specialty gym or boutique studio membership.  
* **1,000 Currency:** A professional massage.  
* **3,000 Currency:** A major wellness trip (e.g., a weekend yoga retreat, hot springs getaway).

## **6\. Progression & Leveling**

Your character level and unlocked moves persist forever, traveling with you from map to map. The Experience (XP) track scales as you level up, starting at 10 boxes and roughly doubling for each subsequent level (e.g., Level 2 requires 10 XP, Level 3 requires 20 XP, Level 4 requires 40 XP).

* **Earning XP:** Defeating an Elite (1 XP), Defeating a Realm Boss (3 XP), Clearing 10 Hexes (1 XP), Completing a Convergence Event (5 XP), Completing a TTRPG Rift (3 XP), Completing a Worldhopper Dojo (2 XP).  
* **Leveling Up:** When the XP track is full, reset your current XP to zero and choose one:  
  1. Add a new Move from your Playbook.  
  2. Add a Move from another Playbook.  
  3. Increase a core stat by \+1 (Maximum \+3).
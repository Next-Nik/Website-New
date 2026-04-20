// data.js — fetches from Supabase, falls back to static data

export const TOP_LEVEL_GOAL =
  "A thriving planet and a thriving humanity — where all life flourishes, and we are proud of the part we played.";

function placeholders(prefix, depth) {
  if (depth === 0) return [];
  return Array.from({ length: 7 }, (_, i) => ({
    id: `${prefix}-${i + 1}`, name: "Being mapped",
    horizonGoal: "Being mapped", description: "Being mapped",
    subDomains: placeholders(`${prefix}-${i + 1}`, depth - 1),
  }));
}
function sub(id, name, horizonGoal, description) {
  return { id, name, horizonGoal, description, subDomains: placeholders(id, 2) };
}

export const STATIC_DOMAINS = [
  { id: "human-being", name: "Human Being",
    horizonGoal: "Every person has what they need to know themselves, develop fully, and bring what they came here to bring.",
    description: "The full terrain of what it means to be human — individually and collectively. Health, education, consciousness, rights, culture. These are not parallel systems. They are dimensions of the same developmental terrain.",
    subDomains: [
      sub("hb-body","Body","Every person lives in a body that is cared for, understood, and able to do what life asks of it.","The physical instrument through which everything else is expressed."),
      sub("hb-mind","Mind","Every person has a mind that is clear, regulated, and capable of meeting complexity.","The cognitive and psychological capacity to understand, navigate, and act in the world."),
      sub("hb-inner-life","Inner Life","Every person has access to their own depth — and the tools to explore it.","The interior dimension of human experience. The territory most systems ignore but which shapes everything collective."),
      sub("hb-development","Development","Every person has the conditions and support to keep growing across their whole life.","How human capacity is cultivated, transmitted, and grown across the lifespan."),
      sub("hb-dignity","Dignity & Rights","Every person is recognised as fully human — with rights that are protected and a life that is their own.","The structural conditions that protect and enable human flourishing."),
      sub("hb-expression","Expression & Culture","Every person can make meaning, create, and contribute to the cultural life of their community.","How human beings process experience and transmit values through creative expression."),
    ]},
  { id: "society", name: "Society",
    horizonGoal: "Humanity knows how to be human together — and every individual is better for it.",
    description: "How human beings organise collective life — the structures, systems, and cultures through which communities govern themselves, relate to each other, and create shared futures. Society is both a collective and a group of individuals. Neither overrides the other.",
    subDomains: [
      sub("soc-governance","Governance","Power serves people, and people trust it to.","The systems through which communities make collective decisions and exercise power."),
      sub("soc-culture","Culture","Every community knows who it is and carries that forward.","The shared meanings, practices, and identities that hold communities together across time."),
      sub("soc-conflict-peace","Conflict & Peace","Disagreement doesn't destroy. It builds.","The mechanisms through which human communities navigate difference, tension, and breakdown."),
      sub("soc-community","Community","Every community has the capacity to shape its own future.","The collective structures of belonging, participation, and mutual care."),
      sub("soc-communication","Communication & Information","What is true is visible. What is false doesn't travel far.","How communities share knowledge, tell stories, and maintain a shared picture of reality."),
      sub("soc-global","Global Coordination","The world acts together when it needs to.","The architecture through which humanity coordinates across national and cultural boundaries."),
    ]},
  { id: "nature", name: "Nature",
    horizonGoal: "Ecosystems are thriving and we are living in harmony with the planet.",
    description: "The living systems of the planet — the ecological, biological, and atmospheric conditions that make all life possible. Humanity as participant in, not owner of, these systems.",
    subDomains: [
      sub("nat-earth","Earth","Soil is alive, deep, and growing.","The living skin of the planet — the foundation of all terrestrial life."),
      sub("nat-air","Air","The atmosphere is stable and clean.","The atmospheric envelope that regulates climate, carries weather, and makes breath possible."),
      sub("nat-salt-water","Salt Water","Oceans and seas are full, diverse, and self-regulating.","The world's oceans and seas — the largest living systems on Earth."),
      sub("nat-fresh-water","Fresh Water","Rivers, lakes, groundwater, and ice are clean, replenished, and free to move.","The freshwater systems that sustain all terrestrial life."),
      sub("nat-flora","Flora","Plant life is diverse, abundant, and spreading.","The plant kingdom — the primary producers that underpin all food webs."),
      sub("nat-fauna","Fauna","Animal life is diverse, wild, and thriving in its habitat.","The animal kingdom — from insects to megafauna, wild and domesticated."),
      sub("nat-living-systems","Living Systems","The invisible networks that connect everything are intact and communicating.","The relational infrastructure of life — the networks that connect all living things."),
    ]},
  { id: "technology", name: "Technology",
    horizonGoal: "Our creations support and amplify life.",
    description: "The tools that amplify or undermine human flourishing. The most powerful lever civilisation has — and the most dangerous. The direction depends entirely on design choices, governance, and who has power over deployment.",
    subDomains: [
      sub("tech-digital","Digital Systems","Information flows freely, honestly, and serves the people using it.","The digital infrastructure through which information moves and decisions are made."),
      sub("tech-biological","Biological Technology","We work with life's own intelligence rather than overriding it.","Technologies that engage directly with living systems — from medicine to agriculture to engineering."),
      sub("tech-infrastructure","Physical Infrastructure","The built world supports life rather than displacing it.","The physical systems through which civilisation moves people, goods, and resources."),
      sub("tech-energy","Energy","Clean energy is abundant, accessible, and equitably distributed.","The systems through which civilisation generates and moves energy."),
      sub("tech-frontier","Frontier & Emerging Technology","What we are building next is governed by wisdom, not just capability.","The technologies at the edge of current knowledge — with the highest potential and the highest risk."),
    ]},
  { id: "finance-economy", name: "Finance & Economy",
    horizonGoal: "Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.",
    description: "How humanity creates, moves, and allocates the resources that sustain life. The economy is not a natural phenomenon. It is a design. It can be redesigned.",
    subDomains: [
      sub("fe-resources","Resources","The planet's resources are used at the rate they can be replenished.","The natural systems that provide the material basis for all economic activity."),
      sub("fe-exchange","Exchange","Value moves freely and fairly between people and communities.","The systems through which people trade, share, and transfer value."),
      sub("fe-capital","Capital","Money flows toward what generates life, not away from it.","The systems through which financial resources are accumulated, invested, and deployed."),
      sub("fe-labour","Labour","Every person's contribution is recognised and fairly returned.","The systems through which human effort is organised, valued, and rewarded."),
      sub("fe-ownership","Ownership","What belongs to everyone is held and governed as such.","The systems that determine who holds what — and on what terms."),
      sub("fe-distribution","Distribution","No one lacks what they need because of where or who they were born.","The systems through which the products of economic activity are shared across populations."),
    ]},
  { id: "legacy", name: "Legacy",
    horizonGoal: "We are ancestors worth having.",
    description: "What we leave behind — the long arc of civilisational continuity, intergenerational responsibility, and the transmission of wisdom across time.",
    subDomains: [
      sub("leg-wisdom","Wisdom","What has been learned is alive, transmittable, and growing.","The accumulated understanding of how to live well — across cultures, traditions, and generations."),
      sub("leg-memory","Memory","What has happened is honestly held and passed forward.","The systems through which communities remember, record, and reckon with their past."),
      sub("leg-ceremony","Ceremony & Ritual","The moments that matter are marked and shared.","The practices through which communities honour transitions, loss, celebration, and the sacred."),
      sub("leg-intergenerational","Intergenerational Relationship","The old and the young are in genuine relationship with each other.","The living connections between generations — the channels through which wisdom, love, and responsibility travel."),
      sub("leg-long-arc","The Long Arc","Decisions are made as if the next seven generations are in the room.","The systems and practices through which humanity takes responsibility for its long-term trajectory."),
    ]},
  { id: "vision", name: "Vision",
    horizonGoal: "Into the unknown. On purpose. Together.",
    description: "Where humanity is going — the imaginative, philosophical, and spiritual capacity to see possibility and orient collective life toward it. This domain makes all the others possible.",
    subDomains: [
      sub("vis-imagination","Imagination","Humanity can see beyond what currently exists.","The capacity to conceive of futures that don't yet exist — and to make them feel real enough to move toward."),
      sub("vis-philosophy","Philosophy & Worldview","We have the frameworks to make sense of where we are and where we're going.","The foundational frameworks through which humanity understands itself, its values, and its place in the cosmos."),
      sub("vis-leadership","Leadership","The people guiding humanity forward are worthy of that role.","The human capacity to orient, inspire, and coordinate others toward what matters."),
      sub("vis-coordination","Coordination","Actors across every domain can find each other and move together.","The infrastructure through which distributed actors align and act without requiring central control."),
      sub("vis-foresight","Foresight","We are making decisions today that the future will thank us for.","The systematic capacity to anticipate, prepare for, and shape what's coming."),
    ]},
];

export async function fetchDomains() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return STATIC_DOMAINS;
    const res = await fetch(`${url}/rest/v1/rpc/get_domain_tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` },
      body: "{}",
    });
    if (!res.ok) return STATIC_DOMAINS;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return STATIC_DOMAINS;
    return data.map(normalise);
  } catch { return STATIC_DOMAINS; }
}

function normalise(n) {
  return { ...n, subDomains: (n.subDomains || []).map(normalise) };
}

export const domains = STATIC_DOMAINS;

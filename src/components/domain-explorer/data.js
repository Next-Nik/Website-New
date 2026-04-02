// data.js — fetches from Supabase, falls back to static data

export const TOP_LEVEL_GOAL =
  "A world that is a net positive for all life — where human civilisation contributes to the flourishing of the planet and each other.";

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
    horizonGoal: "Every person has access to the conditions that allow them to know themselves, develop fully, and contribute meaningfully.",
    description: "The foundation of all collective life. When individuals have the conditions to develop fully — psychologically, physically, and spiritually — everything else follows.",
    subDomains: [
      sub("hb-health","Health & Wellbeing","Every person has access to the physical, psychological, and social conditions that allow them to function and flourish.","The conditions of the body and mind that make full participation in life possible."),
      sub("hb-education","Education & Development","Every person has access to learning environments that cultivate their full human capacity across the lifespan.","How human capacity is cultivated, transmitted, and grown — from early childhood through the full arc of a life."),
      sub("hb-consciousness","Consciousness & Inner Life","The interior dimension of human experience is recognised and resourced as foundational to collective life.","The territory of inner development — contemplative practice, identity, meaning, and the cultivation of presence."),
      sub("hb-rights","Rights, Dignity & Justice","Every person is protected by structures that recognise their inherent dignity and enable full participation in society.","The structural conditions that protect and enable human flourishing — rights, equity, and restorative justice."),
      sub("hb-culture","Culture, Arts & Expression","Human beings have rich access to creative expression, cultural continuity, and the meaning-making that makes life worth living.","How human beings make meaning, process experience, and transmit values through creative and cultural life."),
      sub("hb-personal","Personal Development","Every person has access to tools and frameworks that support their individual growth and self-understanding.","The practices, frameworks, and relationships that support a person in growing into their full potential."),
      sub("hb-community","Community & Belonging","Every person has access to genuine community — the relational fabric that makes individual flourishing sustainable.","The social conditions that make belonging, connection, and mutual care possible at every scale of life."),
    ]},
  { id: "society", name: "Society",
    horizonGoal: "Human communities are organised in ways that generate trust, belonging, and collective agency.",
    description: "The architecture of how we live together — the structures, norms, and institutions that either generate or deplete collective capacity.",
    subDomains: [
      sub("soc-governance","Governance & Democracy","Governance systems are transparent, participatory, and genuinely accountable to the people they serve.","How communities make collective decisions and hold power accountable."),
      sub("soc-justice","Social Justice & Inclusion","Every person can participate fully in society regardless of background, identity, or circumstance.","The work of equity, representation, and dismantling structural barriers."),
      sub("soc-cooperation","Global Cooperation","Nations and peoples work together effectively on shared challenges at planetary scale.","The frameworks, institutions, and practices that enable coordination across borders."),
      sub("soc-culture","Cultural Dynamics","Cultures are vibrant, diverse, and in generative relationship with each other.","How meaning, identity, and values move through communities and across generations."),
      sub("soc-media","Media & Information","Information systems support informed, connected, and discerning citizens.","The flows of information that shape how people understand their world."),
      sub("soc-peace","Peace & Conflict","Conflicts are resolved through dialogue, restorative justice, and structural change rather than violence.","The practices and architectures that prevent, manage, and transform conflict."),
      sub("soc-fabric","Social Fabric","Communities have the trust, cohesion, and mutual care that make collective life resilient.","The relational infrastructure that holds communities together — trust, belonging, civic participation."),
    ]},
  { id: "nature", name: "Nature",
    horizonGoal: "The living systems of the planet are regenerating, and humanity is a net contributor to that regeneration.",
    description: "The living systems that all life depends on — ecological, atmospheric, oceanic — and the human practices that support their regeneration.",
    subDomains: [
      sub("nat-climate","Climate & Atmosphere","Being mapped","Being mapped"),
      sub("nat-ecosystems","Ecosystems & Biodiversity","Being mapped","Being mapped"),
      sub("nat-food","Food, Agriculture & Land","Being mapped","Being mapped"),
      sub("nat-water","Water Systems","Being mapped","Being mapped"),
      sub("nat-ocean","Oceans & Marine Life","Being mapped","Being mapped"),
      sub("nat-built","Built Environment & Nature","Being mapped","Being mapped"),
      sub("nat-energy","Energy & Resources","Being mapped","Being mapped"),
    ]},
  { id: "technology", name: "Technology",
    horizonGoal: "Our tools extend human wisdom and deepen connection, developing in relationship with our capacity to use them well.",
    description: "The tools we build and the futures they make possible — with particular attention to whether those systems serve the full scope of what humanity is trying to become.",
    subDomains: [
      sub("tech-ai","Artificial Intelligence","Being mapped","Being mapped"),
      sub("tech-digital","Digital Systems & Internet","Being mapped","Being mapped"),
      sub("tech-bio","Biotechnology & Life Sciences","Being mapped","Being mapped"),
      sub("tech-energy","Energy Technology","Being mapped","Being mapped"),
      sub("tech-space","Space & Frontier Tech","Being mapped","Being mapped"),
      sub("tech-ethics","Technology Ethics & Governance","Being mapped","Being mapped"),
      sub("tech-human","Human-Technology Interface","Being mapped","Being mapped"),
    ]},
  { id: "finance-economy", name: "Finance & Economy",
    horizonGoal: "Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.",
    description: "The flows that determine what gets built and who benefits — and what it would mean to align those systems with long-term human and planetary flourishing.",
    subDomains: [
      sub("fin-systems","Economic Systems & Design","Being mapped","Being mapped"),
      sub("fin-capital","Capital & Investment","Being mapped","Being mapped"),
      sub("fin-distribution","Distribution & Equity","Being mapped","Being mapped"),
      sub("fin-labour","Labour & Work","Being mapped","Being mapped"),
      sub("fin-trade","Trade & Global Economy","Being mapped","Being mapped"),
      sub("fin-commons","Commons & Shared Resources","Being mapped","Being mapped"),
      sub("fin-measurement","Economic Measurement","Being mapped","Being mapped"),
    ]},
  { id: "legacy", name: "Legacy",
    horizonGoal: "Each generation leaves the conditions for the next generation to flourish more fully than they did.",
    description: "The long arc of civilisational responsibility — what we inherit, what we steward, and what we leave behind.",
    subDomains: [
      sub("leg-wisdom","Intergenerational Wisdom","Being mapped","Being mapped"),
      sub("leg-longterm","Long-Term Thinking & Stewardship","Being mapped","Being mapped"),
      sub("leg-heritage","Heritage & Preservation","Being mapped","Being mapped"),
      sub("leg-future","Future Generations","Being mapped","Being mapped"),
      sub("leg-ceremony","Sacred & Ceremonial Life","Being mapped","Being mapped"),
      sub("leg-mythology","Mythology & Narrative","Being mapped","Being mapped"),
      sub("leg-space","Space Civilisation & Deep Future","Being mapped","Being mapped"),
    ]},
  { id: "vision", name: "Vision",
    horizonGoal: "Humanity has a shared and evolving picture of where it is going — and the coordination infrastructure to move toward it together.",
    description: "The orienting capacity of civilisation itself — the narratives, frameworks, and coordination systems that make collective movement possible.",
    subDomains: [
      sub("vis-futures","Futures & Foresight","Being mapped","Being mapped"),
      sub("vis-philosophy","Philosophy & Worldview","Being mapped","Being mapped"),
      sub("vis-indigenous","Indigenous & Relational Worldviews","Being mapped","Being mapped"),
      sub("vis-leadership","Conscious Leadership","Being mapped","Being mapped"),
      sub("vis-movements","Social Movements & Change","Being mapped","Being mapped"),
      sub("vis-intelligence","Collective Intelligence","Being mapped","Being mapped"),
      sub("vis-purpose","Civilisational Purpose","Being mapped","Being mapped"),
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../src/data/moviesData.json');

// Load existing 1,200 movies
let existingMovies = [];
try {
  existingMovies = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${existingMovies.length} existing base movies.`);
} catch (e) {
  console.error('Error loading existing movies:', e);
}

// Ensure each existing movie has Continent, Country, and isBlockbuster
const enrichedExisting = existingMovies.map((m, idx) => {
  let continent = 'North America';
  let country = 'United States';
  const g = (m.Genre || '').toLowerCase();
  const t = (m.Title || '').toLowerCase();
  const d = (m.Director || '').toLowerCase();
  const a = (m.Actors || '').toLowerCase();

  // Continent / Country detection
  if (g.includes('anime') || t.includes('godzilla') || t.includes('ghibli') || d.includes('miyazaki') || d.includes('kurosawa') || a.includes('toshiro') || d.includes('makoto shinkai')) {
    continent = 'Asia';
    country = 'Japan';
  } else if (d.includes('bong joon') || d.includes('park chan') || t.includes('busan') || t.includes('parasite') || a.includes('song kang')) {
    continent = 'Asia';
    country = 'South Korea';
  } else if (d.includes('rajamouli') || t.includes('rrr') || t.includes('baahubali') || a.includes('shah rukh') || a.includes('aamir')) {
    continent = 'Asia';
    country = 'India';
  } else if (d.includes('wong kar') || d.includes('john woo') || a.includes('jackie chan') || a.includes('bruce lee') || a.includes('donnie yen')) {
    continent = 'Asia';
    country = 'Hong Kong';
  } else if (d.includes('nolan') || d.includes('guy ritchie') || d.includes('ridley scott') || t.includes('bond') || t.includes('007') || t.includes('harry potter') || t.includes('sherlock') || a.includes('caine')) {
    continent = 'Europe';
    country = 'United Kingdom';
  } else if (d.includes('luc besson') || d.includes('denis villeneuve') && d.includes('french') || t.includes('amelie') || a.includes('cassel') || a.includes('cotillard')) {
    continent = 'Europe';
    country = 'France';
  } else if (d.includes('almodovar') || d.includes('del toro') || a.includes('bardem') || a.includes('cruz') || t.includes('pan\'s labyrinth')) {
    continent = 'Europe';
    country = 'Spain';
  } else if (d.includes('fellini') || d.includes('sergio leone') || d.includes('sorrentino') || t.includes('godfather') && d.includes('coppola')) {
    continent = 'North America';
    country = 'United States';
  } else if (t.includes('city of god') || t.includes('elite squad') || d.includes('meirelles') || d.includes('padilha')) {
    continent = 'Latin America';
    country = 'Brazil';
  } else if (d.includes('cuaron') || d.includes('inarritu') || t.includes('roma') || t.includes('coco') || t.includes('amores perros')) {
    continent = 'Latin America';
    country = 'Mexico';
  } else if (t.includes('district 9') || t.includes('tsotsi') || d.includes('blomkamp')) {
    continent = 'Africa';
    country = 'South Africa';
  } else if (t.includes('mad max') || d.includes('george miller') || t.includes('babadook') || a.includes('hugh jackman')) {
    continent = 'North America';
    country = 'United States';
  }

  const isBlockbuster = (
    parseFloat(m.imdbRating || '0') >= 7.8 ||
    parseInt(m.Year || '0', 10) >= 2023 ||
    g.includes('action') || g.includes('sci-fi') || g.includes('adventure') ||
    t.includes('dune') || t.includes('deadpool') || t.includes('avengers') || t.includes('batman') || t.includes('spider') || t.includes('gladiator') || t.includes('alien') || t.includes('interstellar') || t.includes('oppenheimer') || t.includes('avatar')
  );

  return {
    ...m,
    Continent: continent,
    Country: country,
    isBlockbuster: !!isBlockbuster
  };
});

console.log(`Enriched ${enrichedExisting.length} base movies.`);

// Curated Posters Library across different themes
const POSTER_POOLS = {
  scifi: [
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
    'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=500&q=80'
  ],
  action: [
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80'
  ],
  drama: [
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&q=80',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&q=80',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'
  ],
  horror: [
    'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80',
    'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=500&q=80'
  ],
  comedy: [
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=500&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80'
  ],
  animation: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80'
  ]
};

// Target: 10,500 total movies
const TARGET_TOTAL = 10500;
const NEED_NEW = TARGET_TOTAL - enrichedExisting.length;

console.log(`Generating ${NEED_NEW} rich world cinema movies across all continents and release years...`);

const CONTINENT_SPECS = [
  {
    continent: 'Asia',
    weight: 0.32, // 32%
    countries: [
      { name: 'Japan', weight: 0.30, genres: ['Animation', 'Action', 'Drama', 'Horror', 'Sci-Fi', 'Fantasy'], directors: ['Hayao Miyazaki', 'Makoto Shinkai', 'Akira Kurosawa', 'Satoshi Kon', 'Takashi Miike', 'Hideaki Anno', 'Mamoru Hosoda', 'Hirokazu Kore-eda'], actors: ['Ken Watanabe', 'Tatsuya Nakadai', 'Koji Yakusho', 'Minami Hamabe', 'Takeru Satoh', 'Hiroyuki Sanada', 'Nana Komatsu', 'Ryunosuke Kamiki'] },
      { name: 'South Korea', weight: 0.28, genres: ['Thriller', 'Crime', 'Drama', 'Action', 'Horror', 'Romance'], directors: ['Bong Joon-ho', 'Park Chan-wook', 'Na Hong-jin', 'Kim Jee-woon', 'Lee Chang-dong', 'Yeon Sang-ho', 'Ryoo Seung-wan'], actors: ['Song Kang-ho', 'Choi Min-sik', 'Lee Byung-hun', 'Ma Dong-seok', 'Bae Doona', 'Son Ye-jin', 'Park Seo-joon', 'Kim Tae-ri', 'Jung Woo-sung'] },
      { name: 'India', weight: 0.22, genres: ['Action', 'Drama', 'Musical', 'Romance', 'Comedy', 'Thriller', 'War'], directors: ['S.S. Rajamouli', 'Sanjay Leela Bhansali', 'Anurag Kashyap', 'Mani Ratnam', 'Prashanth Neel', 'Lokesh Kanagaraj', 'Atlee'], actors: ['Shah Rukh Khan', 'Prabhas', 'Ram Charan', 'N.T. Rama Rao Jr.', 'Deepika Padukone', 'Ranbir Kapoor', 'Vijay', 'Allu Arjun', 'Kamal Haasan'] },
      { name: 'Hong Kong', weight: 0.12, genres: ['Action', 'Martial Arts', 'Crime', 'Comedy', 'Drama'], directors: ['Wong Kar-wai', 'John Woo', 'Stephen Chow', 'Tsui Hark', 'Johnnie To', 'Wilson Yip'], actors: ['Jackie Chan', 'Tony Leung', 'Chow Yun-fat', 'Jet Li', 'Donnie Yen', 'Maggie Cheung', 'Andy Lau', 'Sammo Hung'] },
      { name: 'Philippines', weight: 0.04, genres: ['Drama', 'Action', 'Horror', 'Romance', 'Comedy'], directors: ['Lav Diaz', 'Brillante Mendoza', 'Erik Matti', 'Cathy Garcia-Molina', 'Jerrold Tarog'], actors: ['John Arcilla', 'Dingdong Dantes', 'Anne Curtis', 'Piolo Pascual', 'Bea Alonzo', 'Kathryn Bernardo', 'Nora Aunor'] },
      { name: 'Thailand', weight: 0.04, genres: ['Action', 'Horror', 'Martial Arts', 'Drama'], directors: ['Prachya Pinkaew', 'Banjong Pisanthanakun', 'Apichatpong Weerasethakul'], actors: ['Tony Jaa', 'Mario Maurer', 'Chutimon Chuengcharoensukying', 'Dan Chupong'] }
    ]
  },
  {
    continent: 'Europe',
    weight: 0.28, // 28%
    countries: [
      { name: 'United Kingdom', weight: 0.35, genres: ['Action', 'Drama', 'Crime', 'Sci-Fi', 'Comedy', 'War', 'Biography', 'Mystery'], directors: ['Christopher Nolan', 'Guy Ritchie', 'Ridley Scott', 'Sam Mendes', 'Danny Boyle', 'Edgar Wright', 'Kenneth Branagh'], actors: ['Christian Bale', 'Tom Hardy', 'Benedict Cumberbatch', 'Gary Oldman', 'Daniel Craig', 'Florence Pugh', 'Cillian Murphy', 'Idris Elba', 'Emma Watson'] },
      { name: 'France', weight: 0.22, genres: ['Drama', 'Romance', 'Thriller', 'Comedy', 'Crime', 'Sci-Fi'], directors: ['Luc Besson', 'Jean-Luc Godard', 'Denis Villeneuve', 'Jacques Audiard', 'Celine Sciamma', 'Mathieu Kassovitz'], actors: ['Vincent Cassel', 'Marion Cotillard', 'Jean Reno', 'Lea Seydoux', 'Audrey Tautou', 'Gilles Lellouche', 'Adèle Exarchopoulos'] },
      { name: 'Germany', weight: 0.14, genres: ['Sci-Fi', 'Drama', 'Thriller', 'War', 'History', 'Crime'], directors: ['Fritz Lang', 'Wolfgang Petersen', 'Florian Henckel von Donnersmarck', 'Tom Tykwer', 'Fatih Akin', 'Baran bo Odar'], actors: ['Daniel Bruhl', 'Christoph Waltz', 'Diane Kruger', 'Sebastian Koch', 'Paula Beer', 'August Diehl'] },
      { name: 'Italy', weight: 0.14, genres: ['Drama', 'Crime', 'Comedy', 'Mystery', 'Western', 'Romance'], directors: ['Sergio Leone', 'Federico Fellini', 'Paolo Sorrentino', 'Giuseppe Tornatore', 'Matteo Garrone', 'Dario Argento'], actors: ['Toni Servillo', 'Monica Bellucci', 'Roberto Benigni', 'Marcello Mastroianni', 'Pierfrancesco Favino', 'Alba Rohrwacher'] },
      { name: 'Spain', weight: 0.10, genres: ['Thriller', 'Horror', 'Drama', 'Mystery', 'Crime'], directors: ['Pedro Almodovar', 'Guillermo del Toro', 'Alejandro Amenabar', 'J.A. Bayona', 'Oriol Paulo'], actors: ['Javier Bardem', 'Penelope Cruz', 'Antonio Banderas', 'Mario Casas', 'Belén Rueda', 'Ana de Armas'] },
      { name: 'Sweden', weight: 0.05, genres: ['Thriller', 'Crime', 'Drama', 'Mystery'], directors: ['Ingmar Bergman', 'Lasse Hallstrom', 'Ruben Ostlund', 'Tomas Alfredson'], actors: ['Stellan Skarsgard', 'Alexander Skarsgard', 'Noomi Rapace', 'Alicia Vikander', 'Mads Mikkelsen'] }
    ]
  },
  {
    continent: 'North America',
    weight: 0.26, // 26%
    countries: [
      { name: 'United States', weight: 0.88, genres: ['Action', 'Sci-Fi', 'Drama', 'Comedy', 'Horror', 'Animation', 'Crime', 'Adventure', 'Fantasy', 'Thriller', 'Mystery', 'Romance', 'War', 'Biography', 'Western'], directors: ['Steven Spielberg', 'Martin Scorsese', 'Quentin Tarantino', 'David Fincher', 'James Cameron', 'Greta Gerwig', 'Jordan Peele', 'Coen Brothers', 'Denis Villeneuve', 'Wes Anderson', 'Chad Stahelski'], actors: ['Leonardo DiCaprio', 'Brad Pitt', 'Denzel Washington', 'Tom Cruise', 'Keanu Reeves', 'Scarlett Johansson', 'Margot Robbie', 'Robert Downey Jr.', 'Joaquin Phoenix', 'Zendaya', 'Timothee Chalamet'] },
      { name: 'Canada', weight: 0.12, genres: ['Sci-Fi', 'Horror', 'Drama', 'Comedy', 'Thriller'], directors: ['David Cronenberg', 'Denis Villeneuve', 'James Cameron', 'Jean-Marc Vallee', 'Sarah Polley'], actors: ['Ryan Reynolds', 'Ryan Gosling', 'Rachel McAdams', 'Jim Carrey', 'Keanu Reeves', 'Elliot Page'] }
    ]
  },
  {
    continent: 'Latin America',
    weight: 0.06, // 6%
    countries: [
      { name: 'Mexico', weight: 0.45, genres: ['Drama', 'Thriller', 'Horror', 'Crime', 'Comedy'], directors: ['Guillermo del Toro', 'Alejandro G. Inarritu', 'Alfonso Cuaron', 'Amat Escalante', 'Michel Franco'], actors: ['Gael Garcia Bernal', 'Diego Luna', 'Salma Hayek', 'Eiza Gonzalez', 'Tenoch Huerta', 'Demian Bichir'] },
      { name: 'Brazil', weight: 0.35, genres: ['Crime', 'Drama', 'Action', 'Thriller'], directors: ['Fernando Meirelles', 'Jose Padilha', 'Kleber Mendonca Filho', 'Walter Salles'], actors: ['Wagner Moura', 'Alice Braga', 'Rodrigo Santoro', 'Selton Mello', 'Seu Jorge', 'Sonia Braga'] },
      { name: 'Argentina', weight: 0.20, genres: ['Mystery', 'Drama', 'Thriller', 'Comedy', 'Crime'], directors: ['Juan Jose Campanella', 'Damian Szifron', 'Pablo Trapero', 'Santiago Mitre'], actors: ['Ricardo Darin', 'Guillermo Francella', 'Cecilia Roth', 'Leonardo Sbaraglia', 'Erica Rivas'] }
    ]
  },
  {
    continent: 'Africa',
    weight: 0.04, // 4%
    countries: [
      { name: 'Nigeria', weight: 0.45, genres: ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance'], directors: ['Kunle Afolayan', 'Kemi Adetiba', 'Genevieve Nnaji', 'Jade Osiberu', 'Tope Oshin'], actors: ['Genevieve Nnaji', 'Richard Mofe-Damijo', 'Ramsey Nouah', 'Funke Akindele', 'Sola Sobowale', 'Femi Adebayo'] },
      { name: 'South Africa', weight: 0.35, genres: ['Action', 'Sci-Fi', 'Drama', 'Thriller', 'Crime'], directors: ['Neill Blomkamp', 'Gavin Hood', 'Oliver Hermanus', 'Jahmil X.T. Qubeka'], actors: ['Sharlto Copley', 'Arnold Vosloo', 'Pearl Thusi', 'John Kani', 'Presley Chweneyagae'] },
      { name: 'Egypt', weight: 0.20, genres: ['Drama', 'Comedy', 'Romance', 'Thriller', 'History'], directors: ['Youssef Chahine', 'Marwan Hamed', 'Amr Salama', 'Tarek Al Arian'], actors: ['Ahmed Ezz', 'Karim Abdel Aziz', 'Hend Sabry', 'Mona Zaki', 'Amr Waked'] }
    ]
  },
  {
    continent: 'Oceania',
    weight: 0.04, // 4%
    countries: [
      { name: 'Australia', weight: 0.65, genres: ['Action', 'Sci-Fi', 'Thriller', 'Drama', 'Horror', 'Comedy'], directors: ['George Miller', 'Peter Weir', 'Baz Luhrmann', 'Justin Kurzel', 'Jennifer Kent'], actors: ['Hugh Jackman', 'Chris Hemsworth', 'Cate Blanchett', 'Nicole Kidman', 'Heath Ledger', 'Margot Robbie', 'Guy Pearce'] },
      { name: 'New Zealand', weight: 0.35, genres: ['Adventure', 'Fantasy', 'Comedy', 'Drama', 'Horror'], directors: ['Peter Jackson', 'Taika Waititi', 'Jane Campion', 'Lee Tamahori'], actors: ['Karl Urban', 'Sam Neill', 'Taika Waititi', 'Cliff Curtis', 'Thomasin McKenzie', 'Melanie Lynskey'] }
    ]
  }
];

// Title generator vocabularies
const PREFIXES = [
  'The', 'A', 'Chronicles of', 'Return of the', 'Shadow of', 'Rise of the', 'Beyond',
  'Echoes of', 'Secret of', 'Legacy of', 'Flight of', 'Dawn of', 'Edge of', 'Voice of',
  'Kingdom of', 'Lords of', 'Ghosts of', 'Riders of', 'Sins of', 'Path of', 'Wrath of',
  'Whispers of', 'City of', 'Age of', 'Order of', 'Guardians of', 'Children of', 'Fallen',
  'Eternal', 'Silent', 'Last', 'Dark', 'Golden', 'Crimson', 'Infinite', 'Savage', 'Iron',
  'Quantum', 'Celestial', 'Broken', 'Hidden', 'Lost', 'Forgotten', 'Mystic', 'Neon', 'Cosmic'
];

const NOUNS = [
  'Horizon', 'Empire', 'Storm', 'Shadow', 'Dragon', 'Dynasty', 'Protocol', 'Matrix',
  'Rebellion', 'Warrior', 'Samurai', 'Assassin', 'Syndicate', 'Vanguard', 'Odyssey',
  'Reckoning', 'Prophecy', 'Titan', 'Nemesis', 'Crusade', 'Valkyrie', 'Requiem',
  'Sovereign', 'Gladiator', 'Specter', 'Eclipse', 'Nexus', 'Conspiracy', 'Phantom',
  'Frontier', 'Mirage', 'Chamber', 'Outlaw', 'Bastion', 'Sanctuary', 'Fortress',
  'Ascent', 'Paradox', 'Genesis', 'Dominion', 'Alliance', 'Chronicle', 'Horizon',
  'Threshold', 'Legacy', 'Labyrinth', 'Monolith', 'Vengeance', 'Renegade', 'Phoenix'
];

const SUFFIXES = [
  'Protocol', 'Reborn', 'Unleashed', 'Rising', 'Redemption', 'Origins', 'Chronicles',
  'Underworld', 'Revolution', 'Invasion', 'Legacy', 'Retribution', 'Endgame', 'Resurrection',
  'Part II', 'Final Chapter', 'Awakening', 'Ascension', 'Infiltration', 'Zero Hour',
  'Aftermath', 'Dark Horizon', 'Infinite War', 'Extraction', 'Confidential', 'Bloodlines'
];

const YEARS_DISTRIBUTION = [
  { range: [2024, 2026], weight: 0.22 },
  { range: [2020, 2023], weight: 0.25 },
  { range: [2010, 2019], weight: 0.25 },
  { range: [2000, 2009], weight: 0.14 },
  { range: [1990, 1999], weight: 0.08 },
  { range: [1970, 1989], weight: 0.04 },
  { range: [1930, 1969], weight: 0.02 }
];

function getRandomYear() {
  const r = Math.random();
  let acc = 0;
  for (const item of YEARS_DISTRIBUTION) {
    acc += item.weight;
    if (r <= acc) {
      const min = item.range[0];
      const max = item.range[1];
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }
  return 2024;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PLOT_TEMPLATES = [
  'In a high-stakes race against time, a courageous protagonist must navigate deadly conspiracies and uncharted territory to save their world.',
  'When an unexpected revelation shatters their peaceful existence, an elite operative unites with unexpected allies to confront a rising empire.',
  'An atmospheric and emotionally charged journey through perilous realms where loyalty, honor, and survival are tested to the absolute limit.',
  'Set against breathtaking international landscapes, two rivals find themselves bound together to stop a catastrophic global event.',
  'A profound exploration of destiny and sacrifice as forgotten secrets emerge from the shadows to reshape the future of civilization.',
  'When an ancient power awakens, an unlikely hero is thrust into the epicenter of a conflict that will determine the fate of millions.',
  'A pulse-pounding thriller featuring masterclass action, relentless suspense, and razor-sharp intellect in a battle for ultimate supremacy.',
  'Deep in the neon-drenched metropolis, an undercover agent uncovers a treacherous web of deceit involving rogue factions and cybernetic crime syndicates.'
];

const generatedMovies = [];
const usedTitles = new Set(enrichedExisting.map(m => (m.Title || '').toLowerCase()));

let currentId = 20000000;

for (let i = 0; i < NEED_NEW; i++) {
  currentId += Math.floor(Math.random() * 5) + 1;
  const imdbID = `tt${currentId.toString().padStart(8, '0')}`;

  // Pick continent based on weight
  let contPick = CONTINENT_SPECS[0];
  const rCont = Math.random();
  let accC = 0;
  for (const cs of CONTINENT_SPECS) {
    accC += cs.weight;
    if (rCont <= accC) {
      contPick = cs;
      break;
    }
  }

  // Pick country based on weight
  let countryPick = contPick.countries[0];
  const rCount = Math.random();
  let accCountry = 0;
  for (const cp of contPick.countries) {
    accCountry += cp.weight;
    if (rCount <= accCountry) {
      countryPick = cp;
      break;
    }
  }

  // Generate unique title
  let title = '';
  let tries = 0;
  while (tries < 50) {
    const p = getRandomItem(PREFIXES);
    const n = getRandomItem(NOUNS);
    const hasSuffix = Math.random() > 0.65;
    const s = hasSuffix ? ` - ${getRandomItem(SUFFIXES)}` : '';
    title = `${p} ${n}${s}`;
    if (!usedTitles.has(title.toLowerCase())) {
      usedTitles.add(title.toLowerCase());
      break;
    }
    tries++;
  }
  if (!title) {
    title = `Chronicle ${i + 1}: ${getRandomItem(NOUNS)}`;
  }

  const year = getRandomYear();
  const selectedGenres = [];
  const gPool = countryPick.genres;
  const numGenres = Math.floor(Math.random() * 3) + 1;
  while (selectedGenres.length < numGenres) {
    const g = getRandomItem(gPool);
    if (!selectedGenres.includes(g)) selectedGenres.push(g);
  }
  const genreStr = selectedGenres.join(', ');

  const rating = (Math.floor(Math.random() * 34) / 10 + 6.0).toFixed(1); // 6.0 - 9.3
  const runtimeMin = Math.floor(Math.random() * 75) + 85; // 85 - 160 min
  const runtime = `${runtimeMin} min`;

  const director = getRandomItem(countryPick.directors);
  const actor1 = getRandomItem(countryPick.actors);
  let actor2 = getRandomItem(countryPick.actors);
  while (actor2 === actor1) {
    actor2 = getRandomItem(countryPick.actors);
  }
  let actor3 = getRandomItem(countryPick.actors);
  while (actor3 === actor1 || actor3 === actor2) {
    actor3 = getRandomItem(countryPick.actors);
  }
  const actors = `${actor1}, ${actor2}, ${actor3}`;

  const plot = getRandomItem(PLOT_TEMPLATES);

  // Poster selection
  let posterPool = POSTER_POOLS.action;
  if (selectedGenres.includes('Sci-Fi')) posterPool = POSTER_POOLS.scifi;
  else if (selectedGenres.includes('Horror')) posterPool = POSTER_POOLS.horror;
  else if (selectedGenres.includes('Drama')) posterPool = POSTER_POOLS.drama;
  else if (selectedGenres.includes('Comedy')) posterPool = POSTER_POOLS.comedy;
  else if (selectedGenres.includes('Animation')) posterPool = POSTER_POOLS.animation;

  const poster = getRandomItem(posterPool);

  const isBlockbuster = (
    parseFloat(rating) >= 7.8 ||
    year >= 2024 ||
    selectedGenres.includes('Action') ||
    selectedGenres.includes('Sci-Fi') ||
    selectedGenres.includes('Adventure')
  );

  generatedMovies.push({
    imdbID,
    Title: title,
    Year: year.toString(),
    Genre: genreStr,
    imdbRating: rating,
    Runtime: runtime,
    Director: director,
    Actors: actors,
    Plot: plot,
    Poster: poster,
    Continent: contPick.continent,
    Country: countryPick.name,
    isBlockbuster: isBlockbuster,
    Quality: Math.random() > 0.4 ? '4K Ultra HD' : '1080p Full HD'
  });
}

console.log(`Generated ${generatedMovies.length} new international movies.`);

const allCombinedMovies = [...enrichedExisting, ...generatedMovies];

console.log(`Total combined movies in CineVault database: ${allCombinedMovies.length}`);

// Write back to JSON
fs.writeFileSync(jsonPath, JSON.stringify(allCombinedMovies, null, 2), 'utf8');

console.log(`✅ Successfully updated ${jsonPath} with ${allCombinedMovies.length} movies!`);

import { motion } from "framer-motion";
import { GameModeCard } from "../components/common/GameModeCard";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

/** Animated spinning globe SVG for the hero section */
function GlobeAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-6"
    >
      <div className="relative w-24 h-24 mx-auto">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-2 border-sky/30 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #1e293b 0%, #0f172a 70%)",
            boxShadow: "0 0 40px rgba(14, 165, 233, 0.15), inset 0 0 20px rgba(14, 165, 233, 0.1)",
          }}
        >
          <span className="text-5xl select-none" role="img" aria-label="Globe">
            🌍
          </span>
        </motion.div>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -inset-2 rounded-full border border-sky/10"
        />
      </div>
    </motion.div>
  );
}

export function Home() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <GlobeAnimation />
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
          Learn the World
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Master flags, capitals, and geography through fun quiz games.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <motion.div variants={item}>
          <GameModeCard
            icon="🏴"
            title="Flag Quiz"
            description="Identify countries by their flags. Multiple difficulties available."
            to="/flag-quiz"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="📍"
            title="Pin the Map"
            description="Locate countries on an interactive world map."
            to="/pin-the-map"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="🗺️"
            title="Name that Shape"
            description="Recognise countries by their outline silhouette."
            to="/name-that-shape"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="🏛️"
            title="Capital Quiz"
            description="Match countries with their capital cities."
            to="/capital-quiz"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="⚡"
            title="Blitz Mode"
            description="Race against the clock — how many can you get in 60 seconds?"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  BoltIcon, 
  ChartPieIcon, 
  CommandLineIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';
import Navbar from '../components/layout/Navbar';
import Button from '../components/common/Button';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-white selection:bg-primary/30">
      <Navbar isLoggedIn={false} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 lg:pt-40 lg:pb-32 bg-mesh">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-8 animate-bounce">
            <SparklesIcon className="w-4 h-4" />
            <span>Nouveauté : Analyse prédictive par Gemini 3</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-extrabold text-slate-900 mb-8 leading-[1.1] tracking-tight">
            La qualité API <br />
            <span className="text-gradient">pilotée par l'IA.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            TestAI automatise la découverte, la génération et l'exécution de vos tests d'API en quelques secondes. Éliminez les bugs avant même qu'ils n'arrivent.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto shadow-2xl">Commencer l'essai gratuit</Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">Découvrir la plateforme</Button>
          </div>
          
          {/* Vidéo Preview */}
          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-black">
              <video
                src="OIG3.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <StatItem value="95%" label="Réduction du temps de QA" />
            <StatItem value="10M+" label="Tests exécutés mensuellement" />
            <StatItem value="24/7" label="Monitoring intelligent" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Conçu pour les équipes modernes</h2>
            <p className="text-slate-500 text-lg">Des outils puissants pour garantir que votre API est toujours performante et sécurisée.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<BoltIcon className="w-10 h-10 text-primary" />}
              title="Génération Instantanée"
              description="Importez votre Swagger et laissez notre IA générer des suites de tests exhaustives."
            />
            <FeatureCard 
              icon={<CheckCircleIcon className="w-10 h-10 text-success" />}
              title="Zéro Faux Positifs"
              description="Nos algorithmes d'analyse sémantique valident les réponses métier, pas seulement les codes HTTP."
            />
            <FeatureCard 
              icon={<CommandLineIcon className="w-10 h-10 text-secondary" />}
              title="Intégration CI/CD"
              description="Une CLI robuste pour intégrer TestAI dans vos pipelines Jenkins ou GitHub Actions."
            />
            <FeatureCard 
              icon={<ChartPieIcon className="w-10 h-10 text-info" />}
              title="Analytics Avancés"
              description="Suivez l'évolution de la stabilité de vos APIs avec des dashboards de performance."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-left"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-5xl font-extrabold text-slate-900 mb-8">Arrêtez de tester manuellement.</h2>
          <p className="text-slate-500 text-xl mb-12 max-w-2xl mx-auto">Rejoignez le futur du testing d'API. Aucune carte de crédit requise pour commencer.</p>
          <Link to="/register">
            <Button size="lg">Déployer TestAI maintenant</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-20 text-slate-500">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">TestAI</span>
          </div>
          <p className="max-w-md mx-auto mb-12">Rendre les APIs plus sûres, un test à la fois.</p>
          <div className="flex justify-center gap-8 text-sm font-bold uppercase tracking-widest text-slate-400">
            <a href="#" className="hover:text-primary transition">Twitter</a>
            <a href="#" className="hover:text-primary transition">Github</a>
            <a href="#" className="hover:text-primary transition">Docs</a>
          </div>
          <div className="mt-16 text-xs text-slate-400">
            © 2024 TestAI Platform. Designé par un expert UI/UX.
          </div>
        </div>
      </footer>
    </div>
  );
};

const StatItem = ({ value, label }: { value: string, label: string }) => (
  <div className="group">
    <p className="text-5xl font-black text-white mb-2 group-hover:text-primary transition-colors">{value}</p>
    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">{label}</p>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
    <div className="mb-8 p-4 rounded-2xl bg-slate-50 inline-block">{icon}</div>
    <h3 className="text-xl font-extrabold text-slate-900 mb-4">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">{description}</p>
  </div>
);

export default LandingPage;
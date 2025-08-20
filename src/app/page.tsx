import { ArrowRight, Activity, Target, TrendingUp, Users, Play, Star } from "lucide-react"
import Image from "next/image"

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-emerald-600 text-white px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Transform Your
            <span className="block text-orange-400">Fitness Journey</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Track workouts, monitor progress, and achieve your fitness goals with our intuitive mobile-first app
          </p>
          <button className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 text-lg rounded-full inline-flex items-center transition-colors">
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative mx-auto max-w-sm">
            <Image
              src="/workout-tracker-logging.png"
              alt="Workout Tracker App Interface"
              width={300}
              height={600}
              className="mx-auto rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Everything You Need to Succeed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md text-center p-6 hover:shadow-lg transition-shadow">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Workout Logging</h3>
              <p className="text-gray-600 text-sm">
                Easily log exercises, sets, reps, and weights with our intuitive interface
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md text-center p-6 hover:shadow-lg transition-shadow">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Progress Tracking</h3>
              <p className="text-gray-600 text-sm">Visualize your strength gains and fitness improvements over time</p>
            </div>

            <div className="bg-white rounded-lg shadow-md text-center p-6 hover:shadow-lg transition-shadow">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Goal Setting</h3>
              <p className="text-gray-600 text-sm">Set and achieve personal fitness goals with smart recommendations</p>
            </div>

            <div className="bg-white rounded-lg shadow-md text-center p-6 hover:shadow-lg transition-shadow">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Community</h3>
              <p className="text-gray-600 text-sm">Connect with fellow fitness enthusiasts and share your journey</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-orange-400 text-orange-400" />
                ))}
              </div>
              <p className="text-gray-900 mb-4">
                "This app completely changed how I approach my workouts. The progress tracking keeps me motivated every
                day!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-emerald-600 font-semibold">SM</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Sarah M.</p>
                  <p className="text-gray-600 text-xs">Fitness Enthusiast</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-orange-400 text-orange-400" />
                ))}
              </div>
              <p className="text-gray-900 mb-4">
                "Simple, clean interface that makes logging workouts effortless. Perfect for busy schedules!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-emerald-600 font-semibold">MJ</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Mike J.</p>
                  <p className="text-gray-600 text-xs">Personal Trainer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-lg mb-8 opacity-90">Join thousands of users who are already transforming their fitness</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-full inline-flex items-center justify-center transition-colors">
              <Play className="mr-2 h-5 w-5" />
              Download for iOS
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 font-semibold px-8 py-4 rounded-full inline-flex items-center justify-center bg-transparent transition-colors">
              <Play className="mr-2 h-5 w-5" />
              Download for Android
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 text-sm">© 2024 Workout Tracker. Transform your fitness journey today.</p>
        </div>
      </footer>
    </main>
  )
}


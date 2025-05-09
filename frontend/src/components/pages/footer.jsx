import { useState, useEffect } from "react";
import { Music, Volume2, Heart, Github, Mail, ExternalLink } from "lucide-react";
import React from "react";
export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeWave, setActiveWave] = useState(0);
  
  // Animation for footer entrance
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  // Animation for sound waves
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWave(prev => (prev + 1) % 3);
    }, 600);
    return () => clearInterval(interval);
  }, []);
  
  const currentYear = new Date().getFullYear();
  
  return (
    <footer 
      className={`bg-gray-900 text-gray-300 transition-all duration-700 ease-in-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top section with waves animation */}
        <div className="flex justify-center py-4 overflow-hidden">
          <div className="flex items-center space-x-3">
            <Music className="text-purple-400" size={24} />
            
            {/* Animated sound waves */}
            <div className="flex items-end h-8 space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full transition-all duration-300 ${
                    activeWave === i ? "h-7" : "h-2"
                  }`}
                />
              ))}
            </div>
            
            <Volume2 className="text-blue-400" size={24} />
          </div>
        </div>
        
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 py-8 border-t border-gray-800">
          {/* About column */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">AurisVue</h3>
            <p className="text-sm text-gray-400 mb-4">
              Bridging communication gaps through technology. Converting audio to Indian Sign Language 
              for improved accessibility and inclusion.
            </p>
            <div className="flex items-center">
              <button className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 px-4 rounded-lg">
                <Heart size={16} className="mr-2" />
                Support Project
              </button>
            </div>
          </div>
          
          {/* Quick links column */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {["Home", "About", "Features", "How It Works", "FAQ"].map((item) => (
                <li key={item}>
                  <a 
                    href="#" 
                    className="hover:text-blue-400 transition-colors flex items-center"
                  >
                    <span className="mr-2 opacity-0 group-hover:opacity-100">•</span>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Connect column */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Connect With Us</h3>
            <div className="space-y-4">
              <a 
                href="#" 
                className="flex items-center text-sm hover:text-blue-400 transition-colors"
              >
                <Github size={18} className="mr-3" />
                <span>GitHub Repository</span>
                <ExternalLink size={14} className="ml-2 opacity-70" />
              </a>
              <a 
                href="#" 
                className="flex items-center text-sm hover:text-blue-400 transition-colors"
              >
                <Mail size={18} className="mr-3" />
                <span>Contact Support</span>
              </a>
            </div>
            
            {/* Newsletter signup */}
            <div className="mt-6">
              <p className="text-sm mb-2">Stay updated with our progress</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="bg-gray-800 text-sm rounded-l-lg px-3 py-2 flex-1 border-r-0 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button className="bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-r-lg px-3">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section with copyright */}
        <div className="px-6 py-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© {currentYear} Audio to ISL Converter. All rights reserved.</p>
          <div className="flex mt-2 md:mt-0 space-x-6">
            <a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
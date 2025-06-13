import Layout from "@/components/layout";
import ApiStatusDashboard from "@/components/api-status-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Database, BarChart, Info } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <motion.div
        className="max-w-5xl w-full mx-auto px-2 sm:px-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="api" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="api" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    API Status
                  </TabsTrigger>
                  <TabsTrigger
                    value="general"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="data" className="flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Data
                  </TabsTrigger>
                  <TabsTrigger
                    value="about"
                    className="flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    About
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="api" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">
                      API Configuration & Status
                    </h3>
                    <p className="text-sm text-gray-500">
                      Monitor your API usage and quota limits. NexLead uses the
                      Google Places API to find business data, with a default
                      quota of 1,000 requests per day.
                    </p>

                    <ApiStatusDashboard />
                  </div>
                </TabsContent>

                <TabsContent value="general" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">General Settings</h3>
                    <p className="text-gray-500">
                      This feature is coming soon. General settings will allow
                      you to customize the application appearance and behavior.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="data" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Data Settings</h3>
                    <p className="text-gray-500">
                      This feature is coming soon. Data settings will allow you
                      to control how your search data is stored and manage your
                      search history.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="about" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">About NexLead</h3>
                    <p className="text-gray-500">
                      NexLead is a B2B lead generation platform designed to
                      streamline contact discovery across multiple industries,
                      with advanced data retrieval capabilities.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500">Version</div>
                        <div className="text-lg font-medium">1.0.0</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500">Released</div>
                        <div className="text-lg font-medium">May 2025</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                      <h4 className="text-md font-medium mb-2">
                        Key Features:
                      </h4>
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        <li>
                          Multi-industry lead generation with flexible search
                        </li>
                        <li>
                          Google Places API integration for real business data
                        </li>
                        <li>Export capabilities to Google Sheets</li>
                        <li>Advanced contact management and tracking</li>
                        <li>Performance monitoring and optimization</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

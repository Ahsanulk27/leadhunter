import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal } from "lucide-react";
import IndustryLoadingSpinner from "@/components/industry-loading-spinner";

interface SearchFormProps {
  onSearch: (data: any) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const { register, handleSubmit, watch, setValue, formState } = useForm({
    defaultValues: {
      company: "",
      industry: "",
      location: "",
      position: "",
      size: "",
      prioritizeDecisionMakers: true,
    }
  });
  
  const watchPrioritizeDecisionMakers = watch("prioritizeDecisionMakers");

  const handleFormSubmit = (data: any) => {
    onSearch(data);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Find B2B Leads</h2>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Business Niche / Industry
              </Label>
              <Select
                onValueChange={(value) => setValue("industry", value)}
                defaultValue=""
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select Business Niche" />
                </SelectTrigger>
                <SelectContent>
                  {/* Technology */}
                  <SelectItem value="software_development">Software Development</SelectItem>
                  <SelectItem value="it_consulting">IT Consulting</SelectItem>
                  <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                  <SelectItem value="web_development">Web Development</SelectItem>
                  <SelectItem value="cloud_services">Cloud Services</SelectItem>
                  <SelectItem value="app_development">Mobile App Development</SelectItem>
                  <SelectItem value="ai_ml">AI & Machine Learning</SelectItem>
                  <SelectItem value="data_analytics">Data Analytics</SelectItem>
                  
                  {/* Finance */}
                  <SelectItem value="financial_services">Financial Services</SelectItem>
                  <SelectItem value="banking">Banking</SelectItem>
                  <SelectItem value="investment_firms">Investment Firms</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="accounting">Accounting & Tax</SelectItem>
                  <SelectItem value="fintech">Financial Technology</SelectItem>
                  
                  {/* Healthcare */}
                  <SelectItem value="hospitals">Hospitals & Clinics</SelectItem>
                  <SelectItem value="biotech">Biotech</SelectItem>
                  <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                  <SelectItem value="medical_devices">Medical Devices</SelectItem>
                  <SelectItem value="healthcare_tech">Healthcare Technology</SelectItem>
                  
                  {/* Real Estate */}
                  <SelectItem value="real_estate">Residential Real Estate</SelectItem>
                  <SelectItem value="commercial_real_estate">Commercial Real Estate</SelectItem>
                  <SelectItem value="property_management">Property Management</SelectItem>
                  <SelectItem value="real_estate_development">Real Estate Development</SelectItem>
                  
                  {/* Marketing & Advertising */}
                  <SelectItem value="marketing_agencies">Marketing Agencies</SelectItem>
                  <SelectItem value="advertising">Advertising</SelectItem>
                  <SelectItem value="digital_marketing">Digital Marketing</SelectItem>
                  <SelectItem value="pr_firms">Public Relations</SelectItem>
                  <SelectItem value="seo_agencies">SEO & Content Marketing</SelectItem>
                  
                  {/* Retail & Manufacturing */}
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="wholesale">Wholesale Distribution</SelectItem>
                  <SelectItem value="consumer_products">Consumer Products</SelectItem>
                  
                  {/* Other Industries */}
                  <SelectItem value="legal">Legal Services</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="transportation">Transportation & Logistics</SelectItem>
                  <SelectItem value="energy">Energy & Utilities</SelectItem>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="nonprofit">Non-Profit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1">
              <Label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </Label>
              <Select
                onValueChange={(value) => setValue("location", value)}
                defaultValue="new_york"
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_york">New York, NY</SelectItem>
                  <SelectItem value="los_angeles">Los Angeles, CA</SelectItem>
                  <SelectItem value="chicago">Chicago, IL</SelectItem>
                  <SelectItem value="miami">Miami, FL</SelectItem>
                  <SelectItem value="dallas">Dallas, TX</SelectItem>
                  <SelectItem value="seattle">Seattle, WA</SelectItem>
                  <SelectItem value="boston">Boston, MA</SelectItem>
                  <SelectItem value="san_francisco">San Francisco, CA</SelectItem>
                  <SelectItem value="denver">Denver, CO</SelectItem>
                  <SelectItem value="atlanta">Atlanta, GA</SelectItem>
                  <SelectItem value="houston">Houston, TX</SelectItem>
                  <SelectItem value="philadelphia">Philadelphia, PA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="col-span-1">
                <Label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Position
                </Label>
                <Select
                  onValueChange={(value) => setValue("position", value)}
                  defaultValue=""
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Any Position" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Executive Roles */}
                    <SelectItem value="ceo">CEO/President</SelectItem>
                    <SelectItem value="coo">COO</SelectItem>
                    <SelectItem value="cfo">CFO</SelectItem>
                    <SelectItem value="cto">CTO/CIO</SelectItem>
                    <SelectItem value="cmo">CMO</SelectItem>
                    <SelectItem value="owner">Owner/Founder</SelectItem>
                    
                    {/* VP Level */}
                    <SelectItem value="vp_sales">VP of Sales</SelectItem>
                    <SelectItem value="vp_marketing">VP of Marketing</SelectItem>
                    <SelectItem value="vp_operations">VP of Operations</SelectItem>
                    <SelectItem value="vp_technology">VP of Technology</SelectItem>
                    <SelectItem value="vp_business_dev">VP of Business Development</SelectItem>
                    
                    {/* Director Level */}
                    <SelectItem value="director_sales">Director of Sales</SelectItem>
                    <SelectItem value="director_marketing">Director of Marketing</SelectItem>
                    <SelectItem value="director_operations">Director of Operations</SelectItem>
                    <SelectItem value="director_it">Director of IT</SelectItem>
                    <SelectItem value="director_hr">Director of HR</SelectItem>
                    
                    {/* Manager Level */}
                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
                    <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                    <SelectItem value="operations_manager">Operations Manager</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="product_manager">Product Manager</SelectItem>
                    
                    {/* Other Roles */}
                    <SelectItem value="sales_representative">Sales Representative</SelectItem>
                    <SelectItem value="account_executive">Account Executive</SelectItem>
                    <SelectItem value="business_analyst">Business Analyst</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size
                </Label>
                <Select
                  onValueChange={(value) => setValue("size", value)}
                  defaultValue=""
                >
                  <SelectTrigger id="size">
                    <SelectValue placeholder="Any Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Size</SelectItem>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501+">501+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Company (Optional)
                </Label>
                <Input
                  id="company"
                  placeholder="e.g. ABC Properties"
                  {...register("company")}
                />
              </div>
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <Checkbox
                id="prioritize"
                checked={watchPrioritizeDecisionMakers}
                onCheckedChange={(checked) => setValue("prioritizeDecisionMakers", checked === true)}
              />
              <Label htmlFor="prioritize" className="ml-2 block text-sm text-gray-700">
                Prioritize decision makers
              </Label>
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showAdvancedFilters ? "Hide Filters" : "Advanced Filters"}
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="mr-2">
                      <IndustryLoadingSpinner 
                        industry={watch("industry")}
                        size="sm"
                        showText={false}
                      />
                    </div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find Industry Leads
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

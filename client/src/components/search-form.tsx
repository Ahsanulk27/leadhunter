import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal } from "lucide-react";

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
                defaultValue="real_estate"
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select Business Niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_estate">Residential Real Estate</SelectItem>
                  <SelectItem value="commercial_real_estate">Commercial Real Estate</SelectItem>
                  <SelectItem value="property_management">Property Management</SelectItem>
                  <SelectItem value="real_estate_development">Real Estate Development</SelectItem>
                  <SelectItem value="luxury_real_estate">Luxury Real Estate</SelectItem>
                  <SelectItem value="property_investment">Real Estate Investment</SelectItem>
                  <SelectItem value="property_brokerage">Property Brokerage</SelectItem>
                  <SelectItem value="real_estate_tech">Real Estate Technology</SelectItem>
                  <SelectItem value="mortgage_brokers">Mortgage Brokers</SelectItem>
                  <SelectItem value="real_estate_appraisal">Real Estate Appraisal</SelectItem>
                  <SelectItem value="title_companies">Title Companies</SelectItem>
                  <SelectItem value="construction">Construction Companies</SelectItem>
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
                    <SelectItem value="broker_owner">Broker/Owner</SelectItem>
                    <SelectItem value="managing_broker">Managing Broker</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="vp_sales">VP of Sales</SelectItem>
                    <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                    <SelectItem value="mortgage_broker">Mortgage Broker</SelectItem>
                    <SelectItem value="real_estate_developer">Real Estate Developer</SelectItem>
                    <SelectItem value="real_estate_investor">Real Estate Investor</SelectItem>
                    <SelectItem value="marketing_director">Marketing Director</SelectItem>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find Leads
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

// import { Button } from "@/components/ui/button";
// import Image from "next/image";
// import Heading from "./_components/Heading";
// import Heroes from "./_components/Heroes";
// import Footer from "./_components/Footer";

// const MarketingPage = () => {
//   return (
//     <div className="min-h-full flex flex-col dark:bg-[#1f1f1f]">
//       <div
//         className="flex flex-col items-center justify-center
//       md:justify-start text-center gap-y-8 flex-1"
//       >
//         <Heading />
//         <Heroes />
//       </div>

//       <Footer />
//     </div>
//   );
// };
// export default MarketingPage;

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Heading from "./_components/Heading";
import Heroes from "./_components/Heroes";
import Footer from "./_components/Footer";

const MarketingPage = () => {
    return (
        <div className="min-h-full flex flex-col dark:bg-[#1f1f1f]">
            {/* Hero Section with enhanced spacing */}
            <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-16 flex-1 px-6 py-12">
                <Heading />
                <div className="w-full max-w-5xl">
                    <Heroes />
                </div>
            </div>

            {/* Additional Sections */}
            <div className="bg-gray-50 dark:bg-gray-900/50 py-16">
                <div className="max-w-6xl mx-auto px-6 text-center space-y-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                        Trusted by Teams Worldwide
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Join thousands of teams who have transformed their
                        workflow with our intelligent workspace
                    </p>

                    {/* Testimonial or additional content can go here */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                        {[
                            {
                                quote: "This has completely changed how our team collaborates. The AI features are incredible!",
                                author: "Sarah Johnson, Product Manager",
                            },
                            {
                                quote: "The document linking suggestions save us hours every week. Game changer!",
                                author: "Mike Chen, Engineering Lead",
                            },
                            {
                                quote: "Best workspace tool we've ever used. The interface is beautiful and intuitive.",
                                author: "Emily Davis, Designer",
                            },
                        ].map((testimonial, index) => (
                            <div
                                key={index}
                                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                            >
                                <p className="text-gray-600 dark:text-gray-300 italic mb-4">
                                    &ldquo;{testimonial.quote}&rdquo;
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {testimonial.author}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default MarketingPage;

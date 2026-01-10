import { CaptureReview } from "@/components/CaptureReview";

const ReviewCaptures = () => {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Review Captures</h1>
        <p className="text-muted-foreground">
          Review and categorize items that need your attention
        </p>
      </div>
      <CaptureReview />
    </div>
  );
};

export default ReviewCaptures;

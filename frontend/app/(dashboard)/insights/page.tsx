export default function Insights() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">AI Insights Engine (Coming Soon)</h1>
            <p className="text-muted-foreground text-sm max-w-md">
                The Insights Engine relies on querying the final JSON Architectural Data produced by the asynchronous BullMQ workers.
                This will be unlocked in later phases once the UI mapping for Extracted Architecture is complete.
            </p>
        </div>
    );
}

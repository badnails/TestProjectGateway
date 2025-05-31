import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

// Utility to get transaction ID from URL
const getTransactionId = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("transactionId");
};

export default function PaymentGateway() {
  const [transactionId, setTransactionId] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [currentStep, setCurrentStep] = useState("username");
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Update sessionStorage only when values are valid
  useEffect(() => {
    if (username) sessionStorage.setItem("username", username);
  }, [username]);

  useEffect(() => {
    if (currentStep && currentStep !== "username") {
      sessionStorage.setItem("currentStep", currentStep);
    }
  }, [currentStep]);

  useEffect(() => {
    if (transactionDetails) {
      sessionStorage.setItem("transactionDetails", JSON.stringify(transactionDetails));
    }
  }, [transactionDetails]);

  // Watch for transaction ID in URL — on change, clear session and reset
  useEffect(() => {
    const currentTxnId = getTransactionId();
    const storedTxnId = sessionStorage.getItem("transactionId");

    if (currentTxnId !== storedTxnId) {
      sessionStorage.clear(); // Clear only when new/different ID
      setUsername("");
      setPin("");
      setTransactionDetails(null);
      setCurrentStep("username");
    }

    if (currentTxnId) {
      setTransactionId(currentTxnId);
      sessionStorage.setItem("transactionId", currentTxnId);

      // Restore session if available
      const savedUsername = sessionStorage.getItem("username");
      const savedStep = sessionStorage.getItem("currentStep");
      const savedDetails = sessionStorage.getItem("transactionDetails");

      if (savedUsername) setUsername(savedUsername);
      if (savedStep) setCurrentStep(savedStep);
      if (savedDetails) setTransactionDetails(JSON.parse(savedDetails));
    } else {
      setError("No transaction ID found in URL");
      setCurrentStep("error");
    }
  }, [window.location.search]);

  // Validate user
  const validateUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/validate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, username }),
      });

      const data = await response.json();

      if (data.success) {
        setTransactionDetails(data.transaction);
        setCurrentStep("pin");
      } else {
        setError(data.message || "User validation failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete transaction
  const completeTransaction = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/complete-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, username, pin }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setCurrentStep("success");
      } else {
        setError(data.message || "Transaction failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "username":
        return (
          <form onSubmit={validateUser} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? <Loader className="animate-spin h-5 w-5" /> : "Continue"}
            </button>
          </form>
        );

      case "pin":
        return (
          <form onSubmit={completeTransaction} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h3 className="text-sm font-medium text-gray-700">Transaction Details</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>Amount: ${transactionDetails?.amount || "0.00"}</p>
                <p>Biller: {transactionDetails?.billerName || "Unknown"}</p>
                <p>Description: {transactionDetails?.description || "No description"}</p>
              </div>
            </div>
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                PIN
              </label>
              <input
                id="pin"
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? <Loader className="animate-spin h-5 w-5" /> : "Pay Now"}
            </button>
          </form>
        );

      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Payment Successful!</h3>
            <p className="mt-1 text-sm text-gray-500">Your transaction was processed.</p>
            <button
              onClick={() => window.close()}
              className="mt-6 inline-flex px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Close
            </button>
          </div>
        );

      case "error":
        return (
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Transaction Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error || "An unexpected error occurred."}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Secure Payment Gateway
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Transaction ID: {transactionId || "Not found"}
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && currentStep !== "error" && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

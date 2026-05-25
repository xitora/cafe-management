import argparse
from cafe_demand_inventory_model import run_demo

def main():
    parser = argparse.ArgumentParser(description="Run cafe demand + inventory demo")
    parser.add_argument(
        "--model",
        choices=["gbr", "lstm"],
        default="gbr",
        help="Model type to use",
    )
    parser.add_argument(
        "--timesteps",
        type=int,
        default=14,
        help="Timesteps for LSTM (if used)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=5,
        help="Epochs for LSTM training (if used)",
    )
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to real csv file. If omitted, the program auto-searches csv files.",
    )
    parser.add_argument(
        "--no-auto-csv",
        action="store_true",
        help="Disable automatic csv discovery and use synthetic data unless --data is provided.",
    )
    parser.add_argument(
        "--allow-short-history",
        action="store_true",
        help="Allow running even when per-item history is short (may reduce accuracy).",
    )
    args = parser.parse_args()

    metrics, recommendations, feature_importance = run_demo(
        model_type=args.model,
        timesteps=args.timesteps,
        epochs=args.epochs,
        data_path=args.data,
        auto_search_csv=not args.no_auto_csv,
        verbose=True,
        allow_short_history=args.allow_short_history,
    )

    print("=== Forecast Metrics ===")
    print(metrics.to_string(index=False))
    print("\n=== Recommended Orders ===")
    print(recommendations.to_string(index=False))
    print("\n=== Feature Importance (Top 10 외생변수 기여도) ===")
    print(feature_importance.head(10).to_string(index=False))

if __name__ == "__main__":
    main()
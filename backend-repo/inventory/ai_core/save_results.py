import argparse
import os

from cafe_demand_inventory_model import run_demo


def main():
    parser = argparse.ArgumentParser(description="Run model and save CSV outputs")
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
    parser.add_argument(
        "--outdir",
        type=str,
        default="results",
        help="Output directory to save CSV files",
    )
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    metrics, recommendations, feature_importance = run_demo(
        model_type=args.model,
        timesteps=args.timesteps,
        epochs=args.epochs,
        data_path=args.data,
        auto_search_csv=not args.no_auto_csv,
        verbose=True,
        allow_short_history=args.allow_short_history,
    )

    metrics_path = os.path.join(args.outdir, "metrics.csv")
    recommendations_path = os.path.join(args.outdir, "recommendations.csv")
    fi_path = os.path.join(args.outdir, "feature_importance.csv")

    metrics.to_csv(metrics_path, index=False)
    recommendations.to_csv(recommendations_path, index=False)
    feature_importance.to_csv(fi_path, index=False)

    print("Saved:")
    print(os.path.abspath(metrics_path))
    print(os.path.abspath(recommendations_path))
    print(os.path.abspath(fi_path))


if __name__ == "__main__":
    main()
function RecentActivity() {
  const activities = [
    {
      name: "Rahul Sharma",
      action: "completed a task",
      time: "10 minutes ago",
    },
    {
      name: "Priya Verma",
      action: "was added to the team",
      time: "1 hour ago",
    },
    {
      name: "Aman Gupta",
      action: "updated his profile",
      time: "2 hours ago",
    },
    {
      name: "Neha Singh",
      action: "created a new task",
      time: "3 hours ago",
    },
  ];

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-[#0b0c0f]">
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-medium">Recent Activity</h3>

        <p className="mt-1 text-xs text-white/40">
          Latest activity from your organization
        </p>
      </div>

      {/* Activities */}
      <div className="divide-y divide-white/5">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                {activity.name.charAt(0)}
              </div>

              {/* Activity */}
              <div>
                <p className="text-sm">
                  <span className="font-medium">{activity.name}</span>{" "}
                  <span className="text-white/50">{activity.action}</span>
                </p>
              </div>
            </div>

            {/* Time */}
            <span className="text-xs text-white/30">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentActivity;

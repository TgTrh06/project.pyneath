// Fixed synthetic IT-learning prompts for paired latency probes. No user data.
module.exports = [
  { id: 'latency-start', request: { capability: 'assisted_start', description: 'Tôi đang học Python và muốn viết hàm kiểm tra một số có chẵn hay lẻ. Tôi chưa biết bắt đầu từ đâu.' } },
  { id: 'latency-recovery', request: { capability: 'stuck_recovery', currentStep: 'Tôi đang học SQL và bị rối khi viết truy vấn JOIN giữa hai bảng users và orders.', stuckMode: 'too_large' } },
  { id: 'latency-seed', request: { capability: 'open_seed_draft', context: 'Đã viết hàm kiểm tra số chẵn lẻ trong Python; lần sau cần thêm một ca kiểm thử cho số âm.' } },
];

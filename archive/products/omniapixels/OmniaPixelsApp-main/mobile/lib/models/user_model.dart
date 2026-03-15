class UserModel {
  final int id;
  final String email;
  final bool isPro;
  final int credits;

  UserModel({
    required this.id,
    required this.email,
    required this.isPro,
    required this.credits,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as int,
      email: json['email'] as String,
      isPro: json['is_pro'] as bool? ?? false,
      credits: json['credits'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'is_pro': isPro,
      'credits': credits,
    };
  }
}

import 'package:flutter/widgets.dart';

class Breakpoints {
  static const double phone = 600;
  static const double tablet = 1024;
}

bool isPhone(BuildContext context) =>
    MediaQuery.sizeOf(context).width < Breakpoints.phone;

bool isTablet(BuildContext context) {
  final w = MediaQuery.sizeOf(context).width;
  return w >= Breakpoints.phone && w < Breakpoints.tablet;
}

bool isDesktop(BuildContext context) =>
    MediaQuery.sizeOf(context).width >= Breakpoints.tablet;



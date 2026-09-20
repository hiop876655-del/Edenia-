cmake_minimum_required(VERSION 3.14)
project(idenia_hisba LANGUAGES CXX)

set(BINARY_NAME "idenia_hisba")
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(flutter)
add_subdirectory(runner)
